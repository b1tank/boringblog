@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Resource ID of the user-assigned managed identity')
param managedIdentityId string

@description('Azure Storage account name')
param storageAccountName string

@description('Public site URL (e.g. https://yourdomain.com)')
param siteUrl string

@description('ACS sender email address')
param acsSenderAddress string

@description('Database connection string')
@secure()
param databaseUrl string

@description('Session encryption secret')
@secure()
param sessionSecret string

@description('ACS connection string')
@secure()
param acsConnectionString string

@description('Storage account key')
@secure()
param storageAccountKey string

@description('Application Insights connection string')
param appInsightsConnectionString string = ''

@description('Log Analytics workspace customer ID')
param logAnalyticsCustomerId string

@description('Log Analytics workspace shared key')
@secure()
param logAnalyticsSharedKey string

// Container Registry to store the blog Docker image
resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: 'boringblogacr'
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

// Container Apps Environment
resource containerAppEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: 'boringblog-env'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalyticsCustomerId
        sharedKey: logAnalyticsSharedKey
      }
    }
  }
}

// Custom domains + managed certificates are configured via CLI post-deploy step
// (chicken-and-egg: cert needs hostname added first, but customDomains needs cert ID)
// See infra.yml "Configure custom domains" step

// Container App
resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'boringblog-app'
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentityId}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerAppEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'http'
        allowInsecure: false
      }
      registries: [
        {
          server: acr.properties.loginServer
          username: acr.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'acr-password'
          value: acr.listCredentials().passwords[0].value
        }
        {
          name: 'database-url'
          value: databaseUrl
        }
        {
          name: 'session-secret'
          value: sessionSecret
        }
        {
          name: 'acs-connection-string'
          value: acsConnectionString
        }
        {
          name: 'storage-account-key'
          value: storageAccountKey
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'boringblog'
          image: '${acr.properties.loginServer}/boringblog:latest'
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            {
              name: 'DATABASE_URL'
              secretRef: 'database-url'
            }
            {
              name: 'SESSION_SECRET'
              secretRef: 'session-secret'
            }
            {
              name: 'ACS_CONNECTION_STRING'
              secretRef: 'acs-connection-string'
            }
            {
              name: 'AZURE_STORAGE_ACCOUNT_KEY'
              secretRef: 'storage-account-key'
            }
            {
              name: 'AZURE_STORAGE_ACCOUNT_NAME'
              value: storageAccountName
            }
            {
              name: 'AZURE_STORAGE_CONTAINER_NAME'
              value: 'images'
            }
            {
              name: 'NEXT_PUBLIC_SITE_URL'
              value: siteUrl
            }
            {
              name: 'ACS_SENDER_ADDRESS'
              value: acsSenderAddress
            }
            {
              name: 'PORT'
              value: '3000'
            }
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              value: appInsightsConnectionString
            }
          ]
          probes: [
            {
              type: 'startup'
              httpGet: {
                path: '/api/health'
                port: 3000
              }
              initialDelaySeconds: 5
              periodSeconds: 10
              failureThreshold: 10
            }
            {
              type: 'liveness'
              httpGet: {
                path: '/api/health'
                port: 3000
              }
              periodSeconds: 30
              failureThreshold: 3
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 1
      }
    }
  }
}

@description('FQDN of the Container App')
output fqdn string = containerApp.properties.configuration.ingress.fqdn

@description('Container App URL')
output url string = 'https://${containerApp.properties.configuration.ingress.fqdn}'

@description('ACR login server')
output acrLoginServer string = acr.properties.loginServer
