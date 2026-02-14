@description('Custom domain name for the blog')
param domainName string

@description('Public IP address of the App Service')
param appServiceIp string

@description('Default hostname of the App Service (e.g. boringblog-app.azurewebsites.net)')
param appServiceHostname string

@description('Custom domain verification ID from App Service')
param verificationId string

resource dnsZone 'Microsoft.Network/dnsZones@2023-07-01-preview' = {
  name: domainName
  location: 'global'
}

resource aRecord 'Microsoft.Network/dnsZones/A@2023-07-01-preview' = {
  parent: dnsZone
  name: '@'
  properties: {
    TTL: 3600
    ARecords: [
      {
        ipv4Address: appServiceIp
      }
    ]
  }
}

resource cnameRecord 'Microsoft.Network/dnsZones/CNAME@2023-07-01-preview' = {
  parent: dnsZone
  name: 'www'
  properties: {
    TTL: 3600
    CNAMERecord: {
      cname: appServiceHostname
    }
  }
}

resource txtRecord 'Microsoft.Network/dnsZones/TXT@2023-07-01-preview' = {
  parent: dnsZone
  name: 'asuid'
  properties: {
    TTL: 3600
    TXTRecords: [
      {
        value: [
          verificationId
        ]
      }
    ]
  }
}

@description('Name servers for the DNS zone — update your domain registrar with these')
output nameServers array = dnsZone.properties.nameServers
