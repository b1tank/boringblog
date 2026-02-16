targetScope = 'resourceGroup'

// ─── Parameters ─────────────────────────────────────────────────────────────

@description('Custom domain name for the blog')
param domainName string

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

@description('Public site URL (e.g. https://yourdomain.com)')
param siteUrl string

@description('Azure region — defaults to resource group location')
param location string = resourceGroup().location

@description('Location for PostgreSQL Flexible Server (some regions have restrictions)')
param postgresLocation string = 'westus3'

@description('Email address for alert notifications')
param alertEmail string

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
    location: postgresLocation
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

module containerApp 'modules/containerapp.bicep' = {
  name: 'containerapp'
  params: {
    location: location
    managedIdentityId: identity.outputs.id
    managedIdentityClientId: identity.outputs.clientId
    storageAccountName: storageAccountName
    siteUrl: siteUrl
    acsSenderAddress: 'DoNotReply@${email.outputs.azureManagedSenderDomain}'
    databaseUrl: postgres.outputs.connectionString
    sessionSecret: sessionSecret
    acsConnectionString: email.outputs.connectionString
    storageAccountKey: storage.outputs.accountKey
    appInsightsConnectionString: appInsights.outputs.connectionString
    logAnalyticsCustomerId: appInsights.outputs.logAnalyticsCustomerId
    logAnalyticsSharedKey: appInsights.outputs.logAnalyticsSharedKey
  }
}

module appInsights 'modules/appinsights.bicep' = {
  name: 'appinsights'
  params: {
    location: location
  }
}

module grafana 'modules/grafana.bicep' = {
  name: 'grafana'
  params: {
    location: location
    appInsightsId: appInsights.outputs.id
    logAnalyticsWorkspaceId: appInsights.outputs.logAnalyticsWorkspaceId
  }
}

module alerts 'modules/alerts.bicep' = {
  name: 'alerts'
  params: {
    location: location
    alertEmail: alertEmail
    appInsightsId: appInsights.outputs.id
  }
}

// ─── DNS ────────────────────────────────────────────────────────────────────
// Uncomment after first deployment to configure custom domain:
//
// module dns 'modules/dns.bicep' = {
//   name: 'dns'
//   params: {
//     domainName: domainName
//     appServiceIp: '<CONTAINER_APP_IP>'
//     appServiceHostname: containerApp.outputs.fqdn
//     verificationId: '<CUSTOM_DOMAIN_VERIFICATION_ID>'
//   }
// }

// ─── Outputs ────────────────────────────────────────────────────────────────

@description('Container App URL')
output appUrl string = containerApp.outputs.url

@description('ACR login server')
output acrLoginServer string = containerApp.outputs.acrLoginServer

@description('Blob storage endpoint for uploaded images')
output storageEndpoint string = storage.outputs.blobEndpoint

@description('ACS sender domain (use with DoNotReply@ prefix)')
output acsSenderDomain string = email.outputs.azureManagedSenderDomain

@description('PostgreSQL server FQDN')
output postgresFqdn string = postgres.outputs.fqdn

@description('Application Insights connection string')
output appInsightsConnectionString string = appInsights.outputs.connectionString

@description('Application Insights instrumentation key')
output appInsightsInstrumentationKey string = appInsights.outputs.instrumentationKey

@description('Grafana dashboard URL')
output grafanaEndpoint string = grafana.outputs.endpoint
