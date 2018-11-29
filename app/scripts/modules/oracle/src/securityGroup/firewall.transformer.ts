import { module } from 'angular';

import { OracleProviderSettings } from 'oracle/oracle.settings';
import { Application } from '@spinnaker/core';

import { IOracleFirewall } from 'oracle/domain/IOracleFirewall';

export class OracleFirewallTransformer {
  public constructNewFirewallTemplate(application: Application): IOracleFirewall {
    const defaultCredentials = application.defaultCredentials.oracle || OracleProviderSettings.defaults.account;
    const defaultRegion = application.defaultRegions.oracle || OracleProviderSettings.defaults.region;
    return {
      name: undefined,
      cloudProvider: 'oracle',
      credentials: defaultCredentials,
      region: defaultRegion,
      freeformTags: {},
      vpcId: null,
      ingressSecurityRules: [],
      egressSecurityRules: [],
    };
  }
}

export const ORACLE_FIREWALL_TRANSFORMER = 'spinnaker.oracle.firewall.transformer';
module(ORACLE_FIREWALL_TRANSFORMER, []).service('oracleFirewallTransformer', OracleFirewallTransformer);
