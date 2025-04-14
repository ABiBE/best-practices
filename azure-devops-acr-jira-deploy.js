
import axios from 'axios';
import chalk from 'chalk';

// 🌍 Récupération des variables d'environnement injectées par Azure DevOps
const {
    RESOURCES_CONTAINER_CONTAINER_REPOSITORY: REPO,
    PREVIOUSCONTAINERREGISTRY: PREVIOUS_ACR,
    CONTAINERREGISTRY: ACR,
    SYSTEM_TEAMFOUNDATIONCOLLECTIONURI,
    SYSTEM_TEAMPROJECT,
    SYSTEM_DEFINITIONNAME: PIPELINE_NAME,
    ENVIRONMENT,
    BUILD_BUILDID: BUILD_ID,
    ACR_TOKEN,
    PREVIOUS_ACR_TOKEN
} = process.env;

// 🔗 URL du pipeline Azure DevOps
const PIPELINE_URL = `${SYSTEM_TEAMFOUNDATIONCOLLECTIONURI}${SYSTEM_TEAMPROJECT}/_build/results?buildId=${BUILD_ID}`;

// 📁 Environnements Jira mappés avec leurs types
const ENVIRONMENTS = {
    dev: {id: 'dev', type: 'development', url: 'dev-url'},
    qua: {id: 'uat', type: 'testing', url: 'qua-url'},
    ppd: {id: 'stg', type: 'staging', url: 'staging-url'},
    prd: {id: 'prd', type: 'production', url: 'production-url'},
};

console.log(chalk.blue.bold('🚀 Démarrage du script de récupération des labels Docker...'));

// 🚀 Lancement du processus principal
(async () => {
    try {
        const issueKeys = await extractIssueKeys();
        await createDeployment(issueKeys);
    } catch (error) {
        console.error(chalk.red.bold('❌ Erreur:'), error.response ? error.response.data : error.message);
    }
})();

// 🔐 Récupère un token Bearer ACR à partir d'un token d'accès JSON
async function getAcrToken(acrUrl, envToken) {
    const token = JSON.parse(envToken).accessToken;
    const response = await axios.get(`https://${acrUrl}/oauth2/token?service=${acrUrl}&scope=repository:*:pull`, {
        headers: {'content-type': 'application/x-www-form-urlencoded'},
        auth: {username: '00000000-0000-0000-0000-000000000000', password: token}
    });
    return response.data.access_token;
}

// 📦 Récupère les derniers tags d'un repository Docker depuis un ACR
async function getTags(acrUrl, repo, token, limit) {
    const response = await axios.get(`https://${acrUrl}/acr/v1/${repo}/_tags?n=${limit}&orderby=timedesc`, {
        headers: {'Authorization': `Bearer ${token}`}
    });
    return response.data.tags.map(tag => tag.name);
}

// 🔍 Extrait les tickets Jira à partir des labels 'gitCommitName' des images Docker
async function extractIssueKeys() {
    try {
        console.log(chalk.yellow('🔑 Obtention des tokens d'authentification...'));
        const [dockerToken, previousDockerToken] = await Promise.all([
            getAcrToken(ACR, ACR_TOKEN),
            getAcrToken(PREVIOUS_ACR, PREVIOUS_ACR_TOKEN)
        ]);

        console.log(chalk.yellow('📦 Récupération des tags des ACR...'));
        const [tags, previousTags] = await Promise.all([
            getTags(ACR, REPO, dockerToken, 2),
            getTags(PREVIOUS_ACR, REPO, previousDockerToken, 100)
        ]);

        // 🧮 Calcul des tags correspondant à l'intervalle de promotion
        const deployedTags = previousTags.length > 1
            ? previousTags.slice(previousTags.indexOf(tags[0]), previousTags.indexOf(tags[1]))
            : previousTags;

        console.log(chalk.yellow('📦 Tags concernés par le déploiement :'), deployedTags);

        // 🔗 Récupération des digests (SHA) pour chaque image taguée
        const digests = await Promise.all(deployedTags.map(tag =>
            axios.get(`https://${PREVIOUS_ACR}/v2/${REPO}/manifests/${tag}`, {
                headers: {
                    'Accept': 'application/vnd.docker.distribution.manifest.v2+json',
                    'Authorization': `Bearer ${previousDockerToken}`
                }
            }).then(response => response.data.config.digest)
        ));
        console.log(chalk.yellow('🔍 Digests récupérés :'), digests);

        // 📋 Extraction du label gitCommitName pour chaque digest
        const issues = await Promise.all(digests.map(digest =>
            axios.get(`https://${PREVIOUS_ACR}/v2/${REPO}/blobs/${digest}`, {
                headers: {
                    'Accept': 'application/vnd.docker.distribution.manifest.v2+json',
                    'Authorization': `Bearer ${previousDockerToken}`
                }
            }).then(response => response.data.config.Labels.gitCommitName ?? '')
        ));

        // 🧩 Extraction des clés Jira avec RegEx
        const pattern = /([A-Z]{3}-\d*)/g;
        const matchedIssues = issues.flatMap(issue =>
            [...issue.matchAll(pattern)].map(match => match[0])
        );

        console.log(chalk.green.bold('🎯 Issues détectées :'), matchedIssues);
        return matchedIssues;
    } catch (error) {
        console.error(chalk.red.bold('❌ Erreur lors de l'extraction des issues :'), error.message);
        throw error;
    }
}

// 🚀 Création du déploiement Jira via l'API Atlassian
async function createDeployment(issueKeys) {
    try {
        // Authentification client OAuth 2.0
        const accessToken = await axios.post(
            'https://api.atlassian.com/oauth/token',
            {
                audience: 'api.atlassian.com',
                grant_type: 'client_credentials',
                client_id: '',
                client_secret: ''
            }
        ).then(response => response.data.access_token);

        const environment = ENVIRONMENTS[ENVIRONMENT];
        if (!environment) throw new Error(`Environnement inconnu : ${ENVIRONMENT}`);

        const date = new Date().toISOString();

        // Construction du payload pour Jira
        const requestBody = {
            deployments: [
                {
                    deploymentSequenceNumber: BUILD_ID,
                    updateSequenceNumber: BUILD_ID,
                    issueKeys,
                    displayName: BUILD_ID,
                    url: environment.url,
                    description: date,
                    lastUpdated: date,
                    state: 'successful',
                    pipeline: {
                        id: PIPELINE_NAME,
                        displayName: PIPELINE_NAME,
                        url: PIPELINE_URL
                    },
                    environment: {
                        id: environment.id,
                        displayName: environment.id,
                        type: environment.type
                    }
                }
            ]
        };

        const response = await axios.post(
            'https://api.atlassian.com/jira/deployments/0.1/cloud/{id-jira}/bulk',
            requestBody,
            {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        console.log(chalk.green.bold('✅ Déploiement réussi :'), response.data);
    } catch (error) {
        console.error(chalk.red.bold('❌ Erreur lors du déploiement :'), error.response ? error.response.data : error.message);
    }
}
