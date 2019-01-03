import { module } from 'angular';

import { Application } from '@spinnaker/core';

import {
  IOracleFirewall,
  IOracleIngressSecurityRule,
  IOracleEgressSecurityRule,
  IOracleFirewallSourceType,
  IOracleFirewallDestinationType,
} from 'oracle/domain/IOracleFirewall';

export class OracleFirewallTransformer {
  public constructNewFirewallTemplate(application: Application): IOracleFirewall {
    return {
      name: application.name,
      application: application.name,
      cloudProvider: 'oracle',
      credentials: undefined,
      region: undefined,
      freeformTags: {},
      vpcId: undefined,
      stack: '',
      detail: '',
      ingressSecurityRules: [],
      egressSecurityRules: [],
      subnetIds: [],
    };
  }

  public constructNewIngressRule(): IOracleIngressSecurityRule {
    return {
      source: 'somesource',
      sourceType: IOracleFirewallSourceType.CIDR_BLOCK,
      icmpOptions: undefined,
      protocol: 'TCP',
      isStateless: true,
      tcpOptions: {
        sourcePortRange: { min: 0, max: 0 },
        destinationPortRange: { min: 80, max: 80 },
      },
      udpOptions: undefined,
    };
  }

  public constructNewEgressRule(): IOracleEgressSecurityRule {
    return {
      destination: 'someDest',
      destinationType: IOracleFirewallDestinationType.CIDR_BLOCK,
      icmpOptions: undefined,
      protocol: 'TCP',
      isStateless: true,
      tcpOptions: {
        sourcePortRange: { min: 0, max: 0 },
        destinationPortRange: { min: 80, max: 80 },
      },
      udpOptions: undefined,
    };
  }
}

export const ORACLE_FIREWALL_TRANSFORMER = 'spinnaker.oracle.firewall.transformer';
module(ORACLE_FIREWALL_TRANSFORMER, []).service('oracleFirewallTransformer', OracleFirewallTransformer);
