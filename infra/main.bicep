targetScope = 'resourceGroup'

// ─── Parameters ─────────────────────────────────────────────────────────────

@description('Custom domain name for the blog')
param domainName string = 'lezhiweng.com'

@description('PostgreSQL administrator login name')
param postgresAdminLogin string

@secure()
@description('PostgreSQL administrator password')
param postgresAdminPassword string

@secure()
@description('Secret used to encrypt iron-session cookies')
param sessionSecret string

@description('Globally unique storage account name (3-24 lowercase alphanumeric)')
param storageAccountName string

@description('Public site URL (e.g. https://lezhiweng.com)')
param siteUrl string

@description('Azure region — defaults to resource group location')
param location string = resourceGroup().location

// ─── Modules ────────────────────────────────────────────────────────────────

module identity 'modules/identity.bicep' = {
  name: 'identity'
  params: {
    location: location
  }
}

module postgres 'modules/postgres.bicep' = {
  name: 'postgres'
  params: {
    location: location
    adminLogin: postgresAdminLogin
    adminPassword: postgresAdminPassword
  }
}

module storage 'modules/storage.bicep' = {
  name: 'storage'
  params: {
    location: location
    storageAccountName: storageAccountName
    allowedOrigins: [
      siteUrl
    ]
  }
}

module email 'modules/email.bicep' = {
  name: 'email'
  params: {
    location: location
    emailDomainName: domainName
  }
}

module keyVault 'modules/keyvault.bicep' = {
  name: 'keyvault'
  params: {
    location: location
    managedIdentityPrincipalId: identity.outputs.principalId
    databaseUrl: postgres.outputs.connectionString
    sessionSecret: sessionSecret
    acsConnectionString: email.outputs.connectionString
    storageAccountKey: storage.outputs.accountKey
  }
}

module appService 'modules/appservice.bicep' = {
  name: 'appservice'
  params: {
    location: location
    managedIdentityId: identity.outputs.id
    managedIdentityClientId: identity.outputs.clientId
    storageAccountName: storageAccountName
    siteUrl: siteUrl
    acsSenderAddress: 'DoNotReply@${email.outputs.azureManagedSenderDomain}'
  }
  dependsOn: [
    keyVault // ensure Key Vault + secrets exist before App Service tries to reference them
  ]
}

// ─── DNS ────────────────────────────────────────────────────────────────────
// Uncomment after first deployment to get the App Service IP and verification ID:
//
// module dns 'modules/dns.bicep' = {
//   name: 'dns'
//   params: {
//     domainName: domainName
//     appServiceIp: '<APP_SERVICE_IP>'
//     appServiceHostname: appService.outputs.defaultHostname
//     verificationId: '<CUSTOM_DOMAIN_VERIFICATION_ID>'
//   }
// }

// ─── Outputs ────────────────────────────────────────────────────────────────

@description('App Service default URL')
output appUrl string = 'https://${appService.outputs.defaultHostname}'

@description('Blob storage endpoint for uploaded images')
output storageEndpoint string = storage.outputs.blobEndpoint

@description('ACS sender domain (use with DoNotReply@ prefix)')
output acsSenderDomain string = email.outputs.azureManagedSenderDomain

@description('PostgreSQL server FQDN')
output postgresFqdn string = postgres.outputs.fqdn
