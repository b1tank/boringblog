@description('Azure region for all resources')
param location string = resourceGroup().location

resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'boringblog-id'
  location: location
}

@description('Principal ID of the managed identity')
output principalId string = managedIdentity.properties.principalId

@description('Client ID of the managed identity')
output clientId string = managedIdentity.properties.clientId

@description('Resource ID of the managed identity')
output id string = managedIdentity.id
