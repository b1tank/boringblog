resource emailService 'Microsoft.Communication/emailServices@2023-04-01' = {
  name: 'boringblog-email'
  location: 'global'
  properties: {
    dataLocation: 'United States'
  }
}

// Azure-managed domain (*.azurecomm.net) for immediate sending
resource azureManagedDomain 'Microsoft.Communication/emailServices/domains@2023-04-01' = {
  parent: emailService
  name: 'AzureManagedDomain'
  location: 'global'
  properties: {
    domainManagement: 'AzureManaged'
    userEngagementTracking: 'Disabled'
  }
}

resource communicationService 'Microsoft.Communication/communicationServices@2023-04-01' = {
  name: 'boringblog-acs'
  location: 'global'
  properties: {
    dataLocation: 'United States'
    linkedDomains: [
      azureManagedDomain.id
    ]
  }
}

@description('ACS connection string for sending emails')
#disable-next-line outputs-should-not-contain-secrets
output connectionString string = communicationService.listKeys().primaryConnectionString

@description('Azure-managed sender address (DoNotReply@<guid>.azurecomm.net)')
output azureManagedSenderDomain string = azureManagedDomain.properties.fromSenderDomain
