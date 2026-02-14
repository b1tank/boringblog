@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Principal ID of the managed identity to grant Key Vault Secrets User role')
param managedIdentityPrincipalId string

@secure()
@description('PostgreSQL connection string')
param databaseUrl string

@secure()
@description('Session encryption secret')
param sessionSecret string

@secure()
@description('ACS connection string for email sending')
param acsConnectionString string

@secure()
@description('Azure Storage account key')
param storageAccountKey string

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: 'boringblog-kv'
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
  }
}

// Key Vault Secrets User role — allows the managed identity to read secrets
resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, managedIdentityPrincipalId, '4633458b-17de-408a-b874-0445c86b69e6')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalId: managedIdentityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

resource secretDatabaseUrl 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'databaseUrl'
  properties: {
    value: databaseUrl
  }
}

resource secretSessionSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'sessionSecret'
  properties: {
    value: sessionSecret
  }
}

resource secretAcsConnectionString 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'acsConnectionString'
  properties: {
    value: acsConnectionString
  }
}

resource secretStorageAccountKey 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'storageAccountKey'
  properties: {
    value: storageAccountKey
  }
}

@description('Key Vault URI for secret references')
output vaultUri string = keyVault.properties.vaultUri
