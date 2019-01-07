import { ISecurityGroup } from '@spinnaker/core';

export enum Protocols {
  TCP = 'TCP',
  UDP = 'UDP',
}

export interface IOraclePortRange {
  min: number;
  max: number;
}

export enum IOracleSecurityRuleType {
  INGRESS,
  EGRESS,
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
  class: String;
  icmpOptions?: IOracleIcmpOptions;
  protocol: string;
  stateless: boolean;
  tcpOptions?: IOraclePortRangeOptions;
  udpOptions?: IOraclePortRangeOptions;
}

export interface IOracleIngressSecurityRule extends IOracleSecurityRule {
  source: string;
  sourceType: IOracleFirewallSourceType;
}

export enum IOracleFirewallSourceType {
  CIDR_BLOCK = 'CIDR_BLOCK',
  SERVICE_CIDR_BLOCK = 'SERVICE_CIDR_BLOCK',
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
  inboundRules: IOracleIngressSecurityRule[];
  outboundRules: IOracleEgressSecurityRule[];
  subnetIds: string[];
  freeformTags?: { [tagName: string]: string };
}
