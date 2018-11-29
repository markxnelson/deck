import IInjectorService = angular.auto.IInjectorService;

import { ReactInject } from '@spinnaker/core';

import { OracleFirewallTransformer } from '../securityGroup/firewall.transformer';

// prettier-ignore
export class OracleReactInject extends ReactInject {
  public get oracleFirewallTransformer() { return this.$injector.get('oracleFirewallTransformer') as OracleFirewallTransformer; }

  public initialize($injector: IInjectorService) {
    this.$injector = $injector;
  }
}

export const OracleReactInjector: OracleReactInject = new OracleReactInject();
