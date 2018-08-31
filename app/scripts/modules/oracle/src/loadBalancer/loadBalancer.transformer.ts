'use strict';

import { module, IPromise } from 'angular';

import { OracleProviderSettings } from '../oracle.settings';
import { Application } from '../../../core/src/application';
import {
  IOracleListener,
  IOracleLoadBalancer,
  IOracleLoadBalancerUpsertCommand,
} from 'oracle/domain/IOracleLoadBalancer';
import { $q } from 'ngimport';

export class OracleLoadBalancerTransformer {
  public normalizeLoadBalancer(loadBalancer: IOracleLoadBalancer): IPromise<IOracleLoadBalancer> {
    /*loadBalancer.serverGroups.forEach(function(serverGroup) {
      serverGroup.account = loadBalancer.account;
      serverGroup.region = loadBalancer.region;

      if (serverGroup.detachedInstances) {
        serverGroup.detachedInstances = serverGroup.detachedInstances.map(function(instanceId) {
          return { id: instanceId };
        });
        serverGroup.instances = serverGroup.instances.concat(serverGroup.detachedInstances);
      } else {
        serverGroup.detachedInstances = [];
      }
    });
    var activeServerGroups = _.filter(loadBalancer.serverGroups, { isDisabled: false });
    loadBalancer.provider = loadBalancer.type;
    loadBalancer.instances = _.chain(activeServerGroups)
      .map('instances')
      .flatten()
      .value();
    loadBalancer.detachedInstances = _.chain(activeServerGroups)
      .map('detachedInstances')
      .flatten()
      .value();*/
    return $q.resolve(loadBalancer);
  }

  public convertLoadBalancerForEditing(loadBalancer: IOracleLoadBalancer): IOracleLoadBalancerUpsertCommand {
    // const applicationName = NameUtils.parseLoadBalancerName(loadBalancer.name).application;
    const toEdit: IOracleLoadBalancerUpsertCommand = {
      name: loadBalancer.name,
      cloudProvider: loadBalancer.cloudProvider,
      credentials: loadBalancer.account,
      region: loadBalancer.region,
      shape: loadBalancer.shape,
      isPrivate: loadBalancer.isPrivate,
      subnetIds: loadBalancer.subnetIds,
      listeners: loadBalancer.listeners.reduce((result: { [name: string]: IOracleListener }, item: IOracleListener) => {
        result[item.name] = item;
        return result;
      }, {}),
      hostnames: loadBalancer.hostnames,
      backendSets: loadBalancer.backendSets,
      freeformTags: loadBalancer.freeformTags,
      loadBalancerType: loadBalancer.type,
      securityGroups: loadBalancer.securityGroups,
      vpcId: loadBalancer.vpcId,
    };
    return toEdit;
  }

  public constructNewLoadBalancerTemplate(application: Application): IOracleLoadBalancerUpsertCommand {
    const defaultCredentials = application.defaultCredentials.oracle || OracleProviderSettings.defaults.account;
    const defaultRegion = application.defaultRegions.oracle || OracleProviderSettings.defaults.region;
    return {
      name: undefined,
      cloudProvider: 'oracle',
      credentials: defaultCredentials,
      region: defaultRegion,
      shape: null,
      isPrivate: false,
      subnetIds: [],
      listeners: {},
      hostnames: [],
      backendSets: [],
      freeformTags: {},
      loadBalancerType: null,
      securityGroups: [],
      vpcId: null,
    };
  }

  public constructNewListenerTemplate(name: string): IOracleListener {
    return { name: name, port: 80, protocol: 'HTTP', defaultBackendSetName: undefined };
  }
}

export const ORACLE_LOAD_BALANCER_TRANSFORMER = 'spinnaker.oracle.loadBalancer.transformer';
module(ORACLE_LOAD_BALANCER_TRANSFORMER, []).service('oracleLoadBalancerTransformer', OracleLoadBalancerTransformer);
/*
module.exports = angular
  .module('spinnaker.oracle.loadBalancer.transformer', [])
  .factory('oracleLoadBalancerTransformer', function($q : IQService) {
    function normalizeLoadBalancer(loadBalancer: IOracleLoadBalancer): IPromise<IOracleLoadBalancer> {
      return $q.resolve(loadBalancer);
    }

    function convertLoadBalancerForEditing(loadBalancer: IOracleLoadBalancer): IOracleLoadBalancerUpsertCommand
    {
      // const applicationName = NameUtils.parseLoadBalancerName(loadBalancer.name).application;
      const toEdit: IOracleLoadBalancerUpsertCommand = {
        name: loadBalancer.name,
        cloudProvider: loadBalancer.cloudProvider,
        credentials: loadBalancer.account,
        region: loadBalancer.region,
        shape: loadBalancer.shape,
        isPrivate: loadBalancer.isPrivate,
        subnetIds: loadBalancer.subnetIds,
        listeners: loadBalancer.listeners,
        hostnames: loadBalancer.hostnames,
        backendSets: loadBalancer.backendSets,
        freeformTags: loadBalancer.freeformTags,
        loadBalancerType: loadBalancer.loadBalancerType,
        securityGroups: loadBalancer.securityGroups,
        vpcId: loadBalancer.vpcId,
      };
      return toEdit;
    }

    function constructNewLoadBalancerTemplate(application: Application): IOracleLoadBalancerUpsertCommand {
      var defaultCredentials = application.defaultCredentials.oracle || OracleProviderSettings.defaults.account,
        defaultRegion = application.defaultRegions.oracle || OracleProviderSettings.defaults.region;
      return {
        name: undefined,
        cloudProvider: 'oracle',
        credentials: defaultCredentials,
        region: defaultRegion,
        shape: null,
        isPrivate: false,
        subnetIds: [],
        listeners: [],
        hostnames: [],
        backendSets: [],
        freeformTags: {},
        loadBalancerType: null,
        securityGroups: [],
        vpcId: null
      };
    }

    return {
      normalizeLoadBalancer: normalizeLoadBalancer,
      convertLoadBalancerForEditing: convertLoadBalancerForEditing,
      constructNewLoadBalancerTemplate: constructNewLoadBalancerTemplate,
    };
  });
*/
