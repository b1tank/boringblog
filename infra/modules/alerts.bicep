@description('Email address for alert notifications')
param alertEmail string

@description('Application Insights resource ID')
param appInsightsId string

// Action group — sends email when alerts fire
resource actionGroup 'Microsoft.Insights/actionGroups@2023-01-01' = {
  name: 'boringblog-alerts'
  location: 'global'
  properties: {
    groupShortName: 'bblog-alert'
    enabled: true
    emailReceivers: [
      {
        name: 'admin-email'
        emailAddress: alertEmail
        useCommonAlertSchema: true
      }
    ]
  }
}

// Alert 1: App down — 0 successful responses for 5 minutes
resource appDownAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'boringblog-app-down'
  location: 'global'
  properties: {
    description: 'No successful HTTP responses for 5 minutes — app may be down'
    severity: 0 // Critical
    enabled: true
    scopes: [
      appInsightsId
    ]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'no-requests'
          metricName: 'requests/count'
          metricNamespace: 'microsoft.insights/components'
          operator: 'LessThanOrEqual'
          threshold: 0
          timeAggregation: 'Count'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// Alert 2: Server errors — >5 5xx responses over 5 minutes
// Note: uses requests/count with resultCode 5xx filter, NOT requests/failed
// (requests/failed includes 404s which are normal on a public site due to bots)
resource highErrorRateAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'boringblog-high-error-rate'
  location: 'global'
  properties: {
    description: 'More than 5 server errors (5xx) in 5 minutes'
    severity: 1 // Error
    enabled: true
    scopes: [
      appInsightsId
    ]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'high-5xx-count'
          metricName: 'requests/count'
          metricNamespace: 'microsoft.insights/components'
          operator: 'GreaterThan'
          threshold: 5
          timeAggregation: 'Count'
          criterionType: 'StaticThresholdCriterion'
          dimensions: [
            {
              name: 'request/resultCode'
              operator: 'Include'
              values: [
                '500'
                '502'
                '503'
                '504'
              ]
            }
          ]
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// Alert 3: Slow responses — p95 server response time > 5s
resource slowResponseAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'boringblog-slow-response'
  location: 'global'
  properties: {
    description: 'Server response time p95 exceeds 5 seconds'
    severity: 2 // Warning
    enabled: true
    scopes: [
      appInsightsId
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'slow-p95'
          metricName: 'requests/duration'
          metricNamespace: 'microsoft.insights/components'
          operator: 'GreaterThan'
          threshold: 5000 // 5 seconds in ms
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

@description('Action group resource ID')
output actionGroupId string = actionGroup.id
