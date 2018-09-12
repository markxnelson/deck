import { ILoadBalancer, ILoadBalancerDeleteCommand, ILoadBalancerUpsertCommand } from '@spinnaker/core';
import { ISubnet } from '../../../core/src/domain';

// import { IAmazonServerGroup } from './IAmazonServerGroup';

export type ListenerProtocol = 'HTTP' | 'HTTPS' | 'TCP' | 'SSL';
export enum LoadBalancingPolicy {
  ROUND_ROBIN = 'ROUND_ROBIN',
  IP_HASH = 'IP_HASH',
  LEAST_CONNECTIONS = 'LEAST_CONNECTIONS',
}

export interface IOracleSubnet extends ISubnet {
  id: string;
  name: string;
  availabilityDomain: string;
  securityListIds: string[];
  vcnId: string;
}

export interface IOracleLoadBalancer extends ILoadBalancer {
  shape: string; // required
  isPrivate: boolean; // required
  subnets: IOracleSubnet[]; // required 1 for private LB, 2 for public LB
  listeners?: { [name: string]: IOracleListener }; // not required to create LB, but useless without it (TODO Can it be added later or should we require listener?)
  hostnames?: IOracleHostname[];
  backendSets?: { [name: string]: IOracleBackEndSet }; // not required to create LB, but useless without it (TODO should we require backend set?)
  freeformTags?: { [tagName: string]: string };
  // TODO support path route sets, certificates
}

export interface IOracleListener {
  name: string;
  protocol: ListenerProtocol;
  port: number;
  defaultBackendSetName: string;
  isSsl: boolean;
  sslConfiguration?: IOracleListenerSSLConfiguration;
  hostnames?: IOracleHostname[];
  // TODO support pathRouteSets
}

export interface IOracleListenerSSLConfiguration {
  certificateName: string;
  verifyDepth: number;
  verifyPeerCertificates: boolean;
}

export interface IOracleHostname {
  name: string;
  hostname: string;
}

// TODO desagar Implement backend set
export interface IOracleBackEndSet {
  name: string;
  policy: LoadBalancingPolicy;
  healthChecker: IOracleBackendSetHealthCheck;
  // TODO desagar sessionPersistenceConfiguration?: IOracleLoadBalancerSessionPersistenceConfiguration;
}

// TODO desagar Implement certificates
export interface IOracleListenerCertificate {
  name: string;
  certificate: string;
  caCertificate: string;
  privateKey: string;
  passphrase: string;
}

export interface IOracleBackendSetHealthCheck {
  urlPath: string; // required
  protocol: 'HTTP' | 'TCP';
  port: number;
  intervalMillis?: number;
  timeoutMillis?: number;
  retries?: number;
  returnCode?: number;
  responseBodyRegex?: string;
}

/**
 * IOracleLoadBalancerUpsertCommand is nearly identical to IOracleLoadBalancer - this object seems
 * to be used for sending info to the back end from the UI.
 */
export interface IOracleLoadBalancerUpsertCommand extends ILoadBalancerUpsertCommand {
  shape: string; // required
  isPrivate: boolean; // required
  subnetIds: string[]; // required 1 for private LB, 2 for public LB
  listeners?: { [name: string]: IOracleListener }; // not required to create LB, but useless without it (TODO Can it be added later or should we require listener?)
  hostnames?: IOracleHostname[];
  backendSets?: { [name: string]: IOracleBackEndSet }; // not required to create LB, but useless without it (TODO should we require backend set?)
  freeformTags?: { [tagName: string]: string };
  loadBalancerType?: string; // is this needed because it is there in ILoadBalancer but not ILoadBalancerUpsertCommand??
  securityGroups: string[]; // is this needed because it is there in ILoadBalancer but not ILoadBalancerUpsertCommand??
  vpcId: string;
}

export interface IOracleLoadBalancerDeleteCommand extends ILoadBalancerDeleteCommand {
  loadBalancerId: string;
}
/*

export interface IListenerRule {
  actions: IListenerAction[];
  default?: boolean;
  conditions: IListenerRuleCondition[];
  priority: number | 'default';
}

export type ListenerRuleConditionField = 'path-pattern' | 'host-header';

export interface IListenerRuleCondition {
  field: ListenerRuleConditionField;
  values: string[];
}
export interface ITargetGroupAttributes {
  deregistrationDelay: number;
  stickinessEnabled: boolean;
  stickinessType: string;
  stickinessDuration: number;
}


export interface ITargetGroup {
  account: string; // returned from clouddriver
  attributes?: ITargetGroupAttributes;
  cloudProvider: string; // returned from clouddriver
  detachedInstances?: IInstance[];
  healthCheckProtocol: string;
  healthCheckPort: number;
  healthCheckPath: string;
  healthTimeout: number;
  healthInterval: number;
  healthyThreshold: number;
  unhealthyThreshold: number;
  instanceCounts?: IInstanceCounts;
  instances?: IInstance[];
  loadBalancerNames: string[]; // returned from clouddriver
  name: string;
  port: number;
  protocol: string;
  provider?: string;
  region: string; // returned from clouddriver
  serverGroups?: IOracleServerGroup[];
  targetType?: string;
  type: string; // returned from clouddriver
  vpcId?: string;
  vpcName?: string;
}
*/
// TODO desagar what is listener and what is listener description? do we need both?
/*
export interface IListenerDescription {
  certificates?: IListenerCertificate[];
  protocol: ListenerProtocol;
  port: number;
  sslPolicy?: string;
  defaultActions: IListenerAction[];
  rules?: IListenerRule[];
}

export interface IALBTargetGroupDescription {
  name: string;
  protocol: 'HTTP' | 'HTTPS';
  port: number;
  targetType: 'instance' | 'ip';
  attributes: {
    // Defaults to 300
    deregistrationDelay?: number;
    // Defaults to false
    stickinessEnabled?: boolean;
    // Defaults to 'lb_cookie'. The only option for now, but they promise there will be more...
    stickinessType?: 'lb_cookie';
    // Defaults to 86400
    stickinessDuration?: number;
  };
  // Defaults to 10
  healthCheckInterval?: number;
  // Defaults to '200-299'
  healthCheckMatcher?: string;
  healthCheckPath: string;
  healthCheckPort: string;
  healthCheckProtocol: 'HTTP' | 'HTTPS';
  // Defaults to 10
  healthyThreshold?: number;
  // Defaults to 5
  healthCheckTimeout?: number;
  // Defaults to 2
  unhealthyThreshold?: number;
}

export interface INLBTargetGroupDescription {
  name: string;
  protocol: 'TCP';
  port: number;
  targetType: 'instance' | 'ip';
  attributes: {
    // Defaults to 300
    deregistrationDelay?: number;
  };
  // Defaults to 10
  healthCheckInterval?: number;
  healthCheckPort: string;
  healthCheckProtocol: 'TCP';
  // Defaults to 10
  healthyThreshold?: number;
  // Defaults to 5
  healthCheckTimeout?: number;
  // Defaults to 10
  unhealthyThreshold?: number;
}
*/
