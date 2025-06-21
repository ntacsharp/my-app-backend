pipeline {
    agent any

    environment {
        IMAGE_NAME = 'tuanasanh/my-app-backend-image'
        DOCKERHUB_CREDENTIALS = '6ca79578-df2d-4da9-9041-b7ee15a6a300'
        GITHUB_CREDENTIALS = '6a37d77f-827f-402f-83ba-57957d4e6bec' 
        DEPLOY_REPO_URL = 'github.com/ntacsharp/my-app-deploy.git'
    }

    stages {
        stage('Checkout') {
            steps {
                echo "Checking out source code"
                checkout scm
                echo "Checking out completete"
            }
        }

        stage('Get Git Tag') {
            steps {
                script {
                    echo "Getting Git tag"

                    def tag = sh(
                        script: '''
                            git describe --tags --exact-match 2>/dev/null || \
                            git describe --tags --abbrev=0 2>/dev/null || \
                            git rev-parse --short HEAD
                        ''',
                        returnStdout: true
                    ).trim()

                    env.TAG_NAME = tag

                    echo "Git tag: ${env.TAG_NAME}"
                }
            }
        }

        stage('Check Required Files') {
            steps {
                script {
                    echo "Finding Dockerfile and package.json"

                    def missingFiles = []

                    if (!fileExists('Dockerfile')) {
                        missingFiles << 'Dockerfile'
                    }

                    if (!fileExists('package.json')) {
                        missingFiles << 'package.json'
                    }

                    if (missingFiles) {
                        error "Files missing: ${missingFiles.join(', ')}. Pipeline stopped."
                    }

                    echo "Found Dockerfile and package.json"
                }
            }
        }

        stage('Check Docker') {
            steps {
                script {
                    echo "Checking Docker"

                    def dockerExists = sh(script: 'which docker || echo "not_found"', returnStdout: true).trim()

                    if (dockerExists == 'not_found') {
                        error "Docker is not installed or is not in PATH."
                    }
                    def dockerVersion = sh(script: 'docker version --format "{{.Server.Version}}" || echo "unavailable"', returnStdout: true).trim()

                    if (dockerVersion == 'unavailable' || dockerVersion == '') {
                        error "Docker daemon is not running or Jenkins cannot access Docker socket."
                    }

                    echo "Docker version: ${dockerVersion}"
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    echo "Building Docker image..."

                    if (!env.TAG_NAME) {
                        error "Tag_name not found"
                    }

                    sh """
                        docker build -t ${env.IMAGE_NAME}:${env.TAG_NAME} .
                    """

                    echo "Image ${env.IMAGE_NAME}:${env.TAG_NAME} built successfully"
                }
            }
        }


        stage('Push Docker Image to Docker Hub') {
            steps {
                script {
                    echo "Pushing to Docker Hub..."

                    if (!env.TAG_NAME || !env.IMAGE_NAME) {
                        error "TAG_NAME or IMAGE_NAME not found."
                    }

                    withCredentials([usernamePassword(
                        credentialsId: env.DOCKER_HUB_CREDENTIALS,
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )]) {
                        sh """
                            echo "${DOCKER_PASS}" | docker login -u "${DOCKER_USER}" --password-stdin
                            docker push ${env.IMAGE_NAME}:${env.TAG_NAME}
                            docker logout
                        """
                    }

                    echo "Successfully pushed Docker image: ${env.IMAGE_NAME}:${env.TAG_NAME}"
                }
            }
        }

        stage('Clone Deploy Repo') {
            steps {
                script {
                    echo "Cloning deploy repo..."

                    sh """
                        rm -rf cloned-deploy-repo
                        mkdir -p cloned-deploy-repo
                    """

                    dir('cloned-deploy-repo') {
                        withCredentials([usernamePassword(
                            credentialsId: env.GITHUB_CREDENTIALS,
                            passwordVariable: 'GIT_PASS',
                            usernameVariable: 'GIT_USER'
                        )]) {
                            sh """
                                git clone https://${GIT_USER}:${GIT_PASS}@${DEPLOY_REPO_URL} .
                                git config user.email "tuanasanh@gmail.com"
                                git config user.name "CI Jenkins"
                            """
                        }
                    }

                    echo "Deploy repo cloned into ./cloned-deploy-repo"
                }
            }
        }

        stage('Update Frontend Image Tag in Deploy Repo') {
            steps {
                script {
                    echo "Updating frontend image tag in values.yaml"

                    def valuesFile = 'cloned-deploy-repo/values.yaml'

                    if (!fileExists(valuesFile)) {
                        error "File ${valuesFile} not found!"
                    }

                    sh """
                        sed -i 's/\\(backend:\\s*\\n\\s*image:\\s*\\n\\s*repository:.*\\n\\s*tag:\\s*\\).*$/\\1"${env.TAG_NAME}"/' ${valuesFile}
                    """

                    echo "Updated tag to ${env.TAG_NAME} in values.yaml"
                }
            }
        }

        stage('Commit & Push Updated values.yaml') {
            steps {
                script {
                    echo "Committing and pushing updated values.yaml..."

                    dir('cloned-deploy-repo') {
                        withCredentials([usernamePassword(
                            credentialsId: env.GITHUB_CREDENTIALS,
                            passwordVariable: 'GIT_PASSWORD',
                            usernameVariable: 'GIT_USERNAME'
                        )]) {
                            sh """
                                git config user.email "tuanasanh@gmail.com"
                                git config user.name "CI Jenkins"

                                git add values.yaml
                                git commit -m "Update backend image tag to ${env.TAG_NAME}"
                                git push https://${GIT_USERNAME}:${GIT_PASSWORD}@${DEPLOY_REPO_URL} HEAD:master
                            """
                        }
                    }

                    echo "Pushed updated values.yaml to deploy repo"
                }
            }
        }
    }
    post {
        always {
            echo "Cleaning up Docker resources and Jenkins workspace..."

            sh """
                echo "Removing Docker images..."
                docker rmi ${env.IMAGE_NAME}:${env.TAG_NAME} || true

                echo "Pruning unused Docker resources..."
                docker system prune -f || true
            """

            echo "Cleaning Jenkins workspace..."
            cleanWs()
        }

        success {
            echo "✅ BACKEND BUILD SUCCESS!"
            echo "✅ Docker Image: ${env.IMAGE_NAME}:${env.TAG_NAME}"
            echo "✅ Config repo updated with new image version"
            echo "✅ Docker Hub: https://hub.docker.com/r/${env.IMAGE_NAME}"
            echo "🚀 Ready for deployment via ArgoCD!"
        }

        failure {
            echo "❌ BACKEND BUILD FAILED!"
            echo "📄 Please check Jenkins logs above for errors."
        }
    }

}