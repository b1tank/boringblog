@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Resource ID of the user-assigned managed identity')
param managedIdentityId string

@description('Client ID of the user-assigned managed identity')
param managedIdentityClientId string

@description('Azure Storage account name')
param storageAccountName string

@description('Public site URL (e.g. https://lezhiweng.com)')
param siteUrl string

@description('ACS sender email address')
param acsSenderAddress string

resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: 'boringblog-plan'
  location: location
  kind: 'linux'
  sku: {
    name: 'B1'
    tier: 'Basic'
  }
  properties: {
    reserved: true // required for Linux
  }
}

resource appService 'Microsoft.Web/sites@2023-12-01' = {
  name: 'boringblog-app'
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentityId}': {}
    }
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    keyVaultReferenceIdentity: managedIdentityId
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      alwaysOn: true
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      appSettings: [
        {
          name: 'DATABASE_URL'
          value: '@Microsoft.KeyVault(VaultName=boringblog-kv;SecretName=databaseUrl)'
        }
        {
          name: 'SESSION_SECRET'
          value: '@Microsoft.KeyVault(VaultName=boringblog-kv;SecretName=sessionSecret)'
        }
        {
          name: 'ACS_CONNECTION_STRING'
          value: '@Microsoft.KeyVault(VaultName=boringblog-kv;SecretName=acsConnectionString)'
        }
        {
          name: 'AZURE_STORAGE_ACCOUNT_KEY'
          value: '@Microsoft.KeyVault(VaultName=boringblog-kv;SecretName=storageAccountKey)'
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
      ]
    }
  }
}

@description('Default hostname of the App Service')
output defaultHostname string = appService.properties.defaultHostName

@description('Resource ID of the App Service')
output id string = appService.id
