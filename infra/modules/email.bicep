@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Custom domain name for email (e.g. lezhiweng.com)')
param emailDomainName string

resource communicationService 'Microsoft.Communication/communicationServices@2023-04-01' = {
  name: 'boringblog-acs'
  location: 'global' // ACS is a global service
  properties: {
    dataLocation: 'United States'
  }
}

resource emailService 'Microsoft.Communication/emailServices@2023-04-01' = {
  name: 'boringblog-email'
  location: 'global'
  properties: {
    dataLocation: 'United States'
  }
}

// Azure-managed domain (*.azurecomm.net) for immediate sending
// Custom domain (lezhiweng.com) requires manual DNS verification — handle separately
resource azureManagedDomain 'Microsoft.Communication/emailServices/domains@2023-04-01' = {
  parent: emailService
  name: 'AzureManagedDomain'
  location: 'global'
  properties: {
    domainManagement: 'AzureManaged'
    userEngagementTracking: 'Disabled'
  }
}

// Link email service to communication service
resource emailLink 'Microsoft.Communication/communicationServices/emailDomainLinks@2024-09-01-preview' = {
  parent: communicationService
  name: guid(communicationService.id, emailService.id, azureManagedDomain.id)
  properties: {
    emailDomainResourceId: azureManagedDomain.id
  }
}

@description('ACS connection string for sending emails')
output connectionString string = communicationService.listKeys().primaryConnectionString

@description('Azure-managed sender address (DoNotReply@<guid>.azurecomm.net)')
output azureManagedSenderDomain string = azureManagedDomain.properties.fromSenderDomain
