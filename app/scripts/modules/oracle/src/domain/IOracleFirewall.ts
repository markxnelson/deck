import { ISecurityGroup } from '@spinnaker/core';

export interface IOraclePortRange {
  min: number;
  max: number;
}

export interface IOracleIcmpOptions {
  code: number;
  type: number;
}

export interface IOraclePortRangeOptions {
  sourcePortRange: IOraclePortRange;
  destinationPortRange: IOraclePortRange;
}

export interface IOracleSecurityRule {
  icmpOptions: IOracleIcmpOptions;
  protocol: string;
  isStateless: boolean;
  tcpOptions: IOraclePortRangeOptions;
  udpOptions: IOraclePortRangeOptions;
}

export interface IOracleIngressSecurityRule extends IOracleSecurityRule {
  source: string;
}

export enum IOracleFirewallDestinationType {
  CIDR_BLOCK = 'CIDR_BLOCK',
  SERVICE_CIDR_BLOCK = 'SERVICE_CIDR_BLOCK',
}

export interface IOracleEgressSecurityRule extends IOracleSecurityRule {
  destination: string;
  destinationType: IOracleFirewallDestinationType;
}

export interface IOracleFirewall extends ISecurityGroup {
  ingressSecurityRules: IOracleIngressSecurityRule[];
  egressSecurityRules: IOracleEgressSecurityRule[];
  freeformTags?: { [tagName: string]: string };
}
