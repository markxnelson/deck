'use strict';

import { IController, module } from 'angular';
import { IModalServiceInstance } from 'angular-ui-bootstrap';
import { StateService } from '@uirouter/angularjs';

import { trimEnd } from 'lodash';

import {
  AccountService,
  InfrastructureCaches,
  LoadBalancerWriter,
  NameUtils,
  NetworkReader,
  TaskMonitor,
} from '@spinnaker/core';

import { Application } from '../../../../core/src/application';
import {
  IOracleBackEndSet,
  IOracleListener,
  IOracleLoadBalancer,
  IOracleSubnet,
  LoadBalancingPolicy,
} from 'oracle/domain/IOracleLoadBalancer';
import {
  ORACLE_LOAD_BALANCER_TRANSFORMER,
  OracleLoadBalancerTransformer,
} from 'oracle/loadBalancer/loadBalancer.transformer';
import { INetwork } from '../../../../core/src/network';
import { IAccountDetails, IRegion } from '../../../../core/src/account';
import { ISubnet } from '../../../../core/src/domain';
import { SubnetReader } from '../../../../core/src/subnet';

export class OracleLoadBalancerController implements IController {
  public oracle = 'oracle';
  public shapes: string[] = ['100Mbps', '400Mbps', '8000Mbps']; // TODO desagar use listShapes to get this from clouddriver later
  public loadBalancingPolicies: string[] = Object.keys(LoadBalancingPolicy).map(k => LoadBalancingPolicy[k as any]);
  public taskMonitor: any;
  public pages: { [key: string]: any } = {
    properties: require('./createLoadBalancerProperties.html'),
    listeners: require('./listeners.html'),
    healthCheck: require('./healthCheck.html'),
    backendSets: require('./backendSets.html'),
  };

  public state: { [key: string]: boolean } = {
    accountsLoaded: false,
    submitting: false,
  };

  public allVnets: INetwork[];
  public allSubnets: IOracleSubnet[];
  public filteredVnets: INetwork[];
  public filteredSubnets: ISubnet[];
  public selectedVnet: INetwork;
  public selectedSubnets: IOracleSubnet[];
  public numSubnetsAllowed = 1;

  /*$scope,
  $uibModalInstance,
  $state,
  oracleLoadBalancerTransformer,
  application,
  loadBalancer,
  isNew,*/

  constructor(
    private $scope: ng.IScope,
    private $uibModalInstance: IModalServiceInstance,
    private $state: StateService,
    private oracleLoadBalancerTransformer: OracleLoadBalancerTransformer,
    private application: Application,
    private loadBalancer: IOracleLoadBalancer,
    private isNew: boolean,
  ) {
    'ngInject';
    this.initializeController();
  }

  public onApplicationRefresh() {
    // If the user has already closed the modal, do not navigate to the new details view
    if (this.$scope.$$destroyed) {
      return;
    }
    this.$uibModalInstance.close();
    const newStateParams = {
      name: this.loadBalancer.name,
      accountId: this.loadBalancer.account,
      region: this.loadBalancer.region,
      provider: 'oracle',
    };

    if (!this.$state.includes('**.loadBalancerDetails')) {
      this.$state.go('.loadBalancerDetails', newStateParams);
    } else {
      this.$state.go('^.loadBalancerDetails', newStateParams);
    }
  }

  public onTaskComplete() {
    this.application.loadBalancers.refresh();
    this.application.loadBalancers.onNextRefresh(this.$scope, this.onApplicationRefresh);
  }

  public initializeCreateMode() {
    AccountService.listAccounts(this.oracle).then((accounts: IAccountDetails[]) => {
      this.$scope.accounts = accounts; // TODO desagar does this need to be in $scope?
      this.state.accountsLoaded = true;
      this.$scope.state = this.state;
      this.accountUpdated();
    });
    this.loadVnets();
    this.loadSubnets();
  }

  public initializeController() {
    if (this.loadBalancer) {
      this.$scope.loadBalancerCmd = this.oracleLoadBalancerTransformer.convertLoadBalancerForEditing(this.loadBalancer);
      if (this.isNew) {
        const nameParts = NameUtils.parseLoadBalancerName(this.loadBalancer.name);
        this.$scope.loadBalancerCmd.stack = nameParts.stack;
        this.$scope.loadBalancerCmd.detail = nameParts.freeFormDetails;
        delete this.$scope.loadBalancerCmd.name;
      }
    } else {
      this.$scope.loadBalancerCmd = this.oracleLoadBalancerTransformer.constructNewLoadBalancerTemplate(
        this.application,
      );
    }
    if (this.isNew) {
      this.updateName();
      this.updateLoadBalancerNames();
      this.initializeCreateMode();
    }
    this.taskMonitor = new TaskMonitor({
      application: this.application,
      title: (this.isNew ? 'Creating ' : 'Updating ') + 'your load balancer',
      modalInstance: this.$uibModalInstance,
      onTaskComplete: this.onTaskComplete,
    });
  }

  public updateLoadBalancerNames() {
    const account = this.$scope.loadBalancerCmd.credentials,
      region = this.$scope.loadBalancerCmd.region;

    const accountLoadBalancerNamesByRegion: { [key: string]: string[] } = {};
    this.application
      .getDataSource('loadBalancers')
      .refresh(true)
      .then(() => {
        this.application.getDataSource('loadBalancers').data.forEach(loadBalancer => {
          if (loadBalancer.account === account) {
            accountLoadBalancerNamesByRegion[loadBalancer.region] =
              accountLoadBalancerNamesByRegion[loadBalancer.region] || [];
            accountLoadBalancerNamesByRegion[loadBalancer.region].push(loadBalancer.name);
          }
        });

        this.$scope.existingLoadBalancerNames = accountLoadBalancerNamesByRegion[region] || [];
      });
  }

  // TODO REMOVE requiresHealthCheckPath
  public requiresHealthCheckPath() {
    return (
      this.$scope.loadBalancerCmd.probes[0].probeProtocol &&
      this.$scope.loadBalancerCmd.probes[0].probeProtocol.indexOf('HTTP') === 0
    );
  }

  public updateName() {
    this.$scope.loadBalancerCmd.name = this.getName();
  }

  public getName() {
    const elb = this.$scope.loadBalancerCmd;
    const elbName = [this.application.name, elb.stack || '', elb.detail || ''].join('-');
    return trimEnd(elbName, '-');
  }

  public accountUpdated() {
    this.loadRegionsForAccount();
  }

  public regionUpdated() {
    this.updateLoadBalancerNames();
    this.updateVnets();
    // this.vnetUpdated();
  }

  public loadRegionsForAccount() {
    AccountService.getRegionsForAccount(this.$scope.loadBalancerCmd.credentials).then((regions: IRegion[]) => {
      this.$scope.regions = regions; // TODO desagar does this need to be in $scope?
    });
  }

  public loadVnets() {
    InfrastructureCaches.clearCache('networks'); // TODO desagar previous code had this line. What does it do exactly? is it safe to clear?
    NetworkReader.listNetworksByProvider(this.oracle).then((vnets: INetwork[]) => {
      this.allVnets = vnets || [];
    });
  }

  public loadSubnets() {
    SubnetReader.listSubnetsByProvider(this.oracle).then((subnets: IOracleSubnet[]) => {
      this.allSubnets = subnets || [];
    });
  }

  public updateVnets() {
    const account = this.$scope.loadBalancerCmd.credentials;
    const region = this.$scope.loadBalancerCmd.region;
    this.filteredVnets = this.allVnets.filter((vnet: INetwork) => {
      return vnet.account === account && vnet.region === region;
    });

    /*this.allVnets.forEach((vnet: INetwork) => {
      if (vnet.account === account && vnet.region === region) {
        this.filteredVnets.push(vnet);
      }
    });*/
  }

  /*public vnetUpdated() {
    // const account = this.$scope.loadBalancerCmd.credentials;
    // const region = this.$scope.loadBalancerCmd.region;
    this.$scope.loadBalancerCmd.selectedVnet = null;
    this.$scope.loadBalancerCmd.vnet = null;
    this.$scope.loadBalancerCmd.vnetResourceGroup = null;
    this.vnets = [];
    InfrastructureCaches.clearCache('networks');

    NetworkReader.listNetworks().then(
      (vnets: any) => {
        if (vnets.oracle) {
          vnets.oracle.forEach((vnet: INetwork) => {
            if (vnet.account === account && vnet.region === region) {
              this.selectedVnets.push(vnet);
            }
          });
        }
      });

    this.subnetUpdated();
  }*/

  public updateSubnets(network: INetwork) {
    this.selectedSubnets = [];
    this.$scope.loadBalancerCmd.subnetIds = [];
    this.filteredSubnets = this.allSubnets.filter((subnet: IOracleSubnet) => {
      return subnet.vcnId === network.id;
    });
  }
  /*public subnetUpdated() {
    this.selectedSubnet = null;
    this.$scope.loadBalancerCmd.subnetIds = [];
    this.subnets = [];
  }*/

  public selectedVnetChanged(network: INetwork) {
    this.selectedVnet = network;
    this.$scope.loadBalancerCmd.vpcId = network.id;
    this.updateSubnets(network);
  }

  public isPrivateChanged() {
    this.numSubnetsAllowed = this.$scope.loadBalancerCmd.isPrivate ? 1 : 2;
  }

  public listenerNameChanged() {
    // alignObjectKeysToProperty(this.$scope.loadBalancerCmd.listeners, 'name');
    // Listener name has changed, which means that its key in the listener map will no longer match
    // the listener name. Find any listener(s) whose name does not match their key in the
    // map, and make the listener name the key for the listener(s)
    const nameChangedKeys: string[] = Object.keys(this.$scope.loadBalancerCmd.listeners).filter(
      key => key !== this.$scope.loadBalancerCmd.listeners[key].name,
    );
    nameChangedKeys.forEach(key => {
      const listener: IOracleListener = this.$scope.loadBalancerCmd.listeners[key];
      delete this.$scope.loadBalancerCmd.listeners[key];
      this.$scope.loadBalancerCmd.listeners[listener.name] = listener;
    });
  }

  public backendSetNameChanged() {
    // BackendSet name has changed, which means that its key in the backendSet map will no longer
    // match the backendSet name. Find any backendSet(s) whose name does not match their key in the
    // map, and make the backendSet name the key for the backendSet(s)
    this.alignObjectKeysToProperty(this.$scope.loadBalancerCmd.backendSets, 'name');
  }

  private alignObjectKeysToProperty(objectToAlign: { [key: string]: any }, propertyName: string) {
    const propChangedKeys: string[] = Object.keys(objectToAlign).filter(
      key => key !== objectToAlign[key][propertyName],
    );
    propChangedKeys.forEach(key => {
      const valueForKey: any = objectToAlign[key];
      const newKey: string = valueForKey[propertyName];
      delete objectToAlign[key];
      objectToAlign[newKey] = valueForKey;
    });
  }
  public removeListener(name: string) {
    delete this.$scope.loadBalancerCmd.listeners[name];
  }

  public addListener() {
    const numListeners: number = Object.keys(this.$scope.loadBalancerCmd.listeners).length;
    const newListener: IOracleListener = this.oracleLoadBalancerTransformer.constructNewListenerTemplate(
      'listener' + (numListeners + 1),
    );
    this.$scope.loadBalancerCmd.listeners[newListener.name] = newListener;
  }

  public removeBackendSet(name: string) {
    delete this.$scope.loadBalancerCmd.backendSets[name];
  }

  public addBackendSet() {
    const numBackendSets: number = Object.keys(this.$scope.loadBalancerCmd.backendSets).length;
    const newBackendSet: IOracleBackEndSet = this.oracleLoadBalancerTransformer.constructNewBackendSetTemplate(
      'backendSet' + (numBackendSets + 1),
    );
    this.$scope.loadBalancerCmd.backendSets[newBackendSet.name] = newBackendSet;
  }

  public submit() {
    const descriptor = this.isNew ? 'Create' : 'Update';

    this.taskMonitor.submit(() => {
      const params = {
        cloudProvider: 'oracle',
        application: this.application.name,
        clusterName: this.$scope.loadBalancerCmd.clusterName,
        resourceGroupName: this.$scope.loadBalancerCmd.clusterName,
        loadBalancerName: this.$scope.loadBalancerCmd.name,
      };

      if (this.selectedVnet) {
        this.$scope.loadBalancerCmd.vpcId = this.selectedVnet.id;
      }

      if (this.selectedSubnets && this.selectedSubnets.length > 0) {
        this.$scope.loadBalancerCmd.subnetIds = this.selectedSubnets.map((subnet: IOracleSubnet) => {
          return subnet.id;
        });
      }

      // TODO desagar immediate!! have a listeners array in this object and directly populate
      // in loadBalancerCmd at the end instead of this ugly re-doing. Also, validate uniqueness of listener names
      // Should we also restrict protocol port to unique across listeners?
      this.$scope.loadBalancerCmd.type = 'upsertLoadBalancer';
      if (!this.$scope.loadBalancerCmd.vnet && !this.$scope.loadBalancerCmd.subnetType) {
        this.$scope.loadBalancerCmd.securityGroups = null;
      }

      return LoadBalancerWriter.upsertLoadBalancer(this.$scope.loadBalancerCmd, this.application, descriptor, params);
    });
  }

  public cancel() {
    this.$uibModalInstance.dismiss();
  }
}

export const ORACLE_LOAD_BALANCER_CREATE_CONTROLLER = 'spinnaker.oracle.loadBalancer.create.controller';
module(ORACLE_LOAD_BALANCER_CREATE_CONTROLLER, [
  require('angular-ui-bootstrap'),
  ORACLE_LOAD_BALANCER_TRANSFORMER,
]).controller('oracleCreateLoadBalancerCtrl', OracleLoadBalancerController);
