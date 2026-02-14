@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Administrator login name for the PostgreSQL server')
param adminLogin string

@secure()
@description('Administrator password for the PostgreSQL server')
param adminPassword string

resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: 'boringblog-db'
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: adminLogin
    administratorLoginPassword: adminPassword
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: postgresServer
  name: 'boringblog'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// Allow Azure services to connect (start IP 0.0.0.0 = Azure-internal traffic)
resource firewallRule 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = {
  parent: postgresServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

@description('PostgreSQL connection string (password placeholder — replaced at runtime via Key Vault)')
output connectionString string = 'postgresql://${adminLogin}:${adminPassword}@${postgresServer.properties.fullyQualifiedDomainName}:5432/boringblog?sslmode=require'

@description('Fully qualified domain name of the PostgreSQL server')
output fqdn string = postgresServer.properties.fullyQualifiedDomainName
