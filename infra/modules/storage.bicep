@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Globally unique name for the storage account (3-24 lowercase alphanumeric)')
param storageAccountName string

@description('Allowed origins for CORS (e.g. https://lezhiweng.com)')
param allowedOrigins array

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  kind: 'StorageV2'
  sku: {
    name: 'Standard_LRS'
  }
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storageAccount
  name: 'default'
  properties: {
    cors: {
      corsRules: [
        {
          allowedOrigins: allowedOrigins
          allowedMethods: [
            'GET'
            'PUT'
            'POST'
          ]
          allowedHeaders: [
            '*'
          ]
          exposedHeaders: [
            '*'
          ]
          maxAgeInSeconds: 3600
        }
      ]
    }
  }
}

resource imagesContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'images'
  properties: {
    publicAccess: 'Blob'
  }
}

@description('Storage account name')
output name string = storageAccount.name

@description('Blob service endpoint URL')
output blobEndpoint string = storageAccount.properties.primaryEndpoints.blob

@description('Primary storage account key')
output accountKey string = storageAccount.listKeys().keys[0].value
