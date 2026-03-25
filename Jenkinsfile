pipeline {
    agent any

    environment {
        COMPOSE_FILE = 'docker-compose.prod.yml'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install') {
            steps {
                sh 'corepack enable && corepack prepare pnpm@latest --activate'
                sh 'pnpm install --frozen-lockfile'
            }
        }

        stage('Build API') {
            steps {
                sh 'pnpm --filter api prisma:generate'
                sh 'pnpm build:api'
            }
        }

        stage('Build Web') {
            steps {
                sh 'pnpm build:web'
            }
        }

        stage('Docker Build') {
            steps {
                sh "docker compose -f ${COMPOSE_FILE} build --no-cache"
            }
        }

        stage('Deploy') {
            steps {
                sh "docker compose -f ${COMPOSE_FILE} up -d --remove-orphans"
            }
        }
    }

    post {
        success {
            echo 'Deployment successful.'
        }
        failure {
            echo 'Pipeline failed. Check logs above.'
        }
    }
}
