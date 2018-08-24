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
import { IOracleLoadBalancerUpsertCommand } from 'oracle/domain/IOracleLoadBalancer';
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
  public taskMonitor: any;
  public pages: { [key: string]: any } = {
    properties: require('./createLoadBalancerProperties.html'),
    listeners: require('./listeners.html'),
    healthCheck: require('./healthCheck.html'),
  };

  public state: { [key: string]: boolean } = {
    accountsLoaded: false,
    submitting: false,
  };

  public allVnets: INetwork[];
  public allSubnets: ISubnet[];
  public filteredVnets: INetwork[];
  public filteredSubnets: ISubnet[];
  public selectedVnet: INetwork;
  public selectedSubnet: ISubnet;
  public existingLoadBalancerNames: string[];

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
    private loadBalancer: IOracleLoadBalancerUpsertCommand,
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
      accountId: this.loadBalancer.credentials,
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
      this.loadBalancer = this.oracleLoadBalancerTransformer.convertLoadBalancerForEditing(this.loadBalancer);
      if (this.isNew) {
        const nameParts = NameUtils.parseLoadBalancerName(this.loadBalancer.name);
        this.loadBalancer.stack = nameParts.stack;
        this.loadBalancer.detail = nameParts.freeFormDetails;
        delete this.loadBalancer.name;
      }
    } else {
      this.loadBalancer = this.oracleLoadBalancerTransformer.constructNewLoadBalancerTemplate(this.application);
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
    const account = this.loadBalancer.credentials,
      region = this.loadBalancer.region;

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

        this.existingLoadBalancerNames = accountLoadBalancerNamesByRegion[region] || [];
      });
  }

  public requiresHealthCheckPath() {
    return this.loadBalancer.probes[0].probeProtocol && this.loadBalancer.probes[0].probeProtocol.indexOf('HTTP') === 0;
  }

  public updateName() {
    this.loadBalancer.name = this.getName();
  }

  public getName() {
    const elb = this.loadBalancer;
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
    AccountService.getRegionsForAccount(this.loadBalancer.credentials).then((regions: IRegion[]) => {
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
    SubnetReader.listSubnetsByProvider(this.oracle).then((subnets: ISubnet[]) => {
      this.allSubnets = subnets || [];
    });
  }

  public updateVnets() {
    const account = this.loadBalancer.credentials;
    const region = this.loadBalancer.region;
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
    // const account = this.loadBalancer.credentials;
    // const region = this.loadBalancer.region;
    this.loadBalancer.selectedVnet = null;
    this.loadBalancer.vnet = null;
    this.loadBalancer.vnetResourceGroup = null;
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
    this.selectedSubnet = null;
    this.loadBalancer.subnetIds = [];
    this.filteredSubnets = this.allSubnets.filter((subnet: ISubnet) => {
      return subnet.vcnId === network.id;
    });
  }
  /*public subnetUpdated() {
    this.selectedSubnet = null;
    this.loadBalancer.subnetIds = [];
    this.subnets = [];
  }*/

  public selectedVnetChanged(network: INetwork) {
    this.selectedVnet = network;
    this.loadBalancer.vpcId = network.id;
    this.updateSubnets(network);
    /*this.loadBalancer.vnetResourceGroup = item.resourceGroup;*/
    /*if (item.subnets) {
      item.subnets.map((subnet) => {
        const addSubnet = true;
        if (subnet.devices) {
          subnet.devices.map((device) => {
            if (device && device.type !== 'applicationGateways') {
              addSubnet = false;
            }
          });
        }
        if (addSubnet) {
          this.selectedSubnets.push(subnet);
        }
      });
    }*/
  }

  public removeListener(index: number) {
    this.loadBalancer.loadBalancingRules.splice(index, 1);
  }

  public addListener() {
    this.loadBalancer.loadBalancingRules.push({ protocol: 'HTTP' });
  }

  public submit() {
    const descriptor = this.isNew ? 'Create' : 'Update';

    this.taskMonitor.submit(function() {
      const params = {
        cloudProvider: 'oracle',
        appName: this.application.name,
        clusterName: this.loadBalancer.clusterName,
        resourceGroupName: this.loadBalancer.clusterName,
        loadBalancerName: this.loadBalancer.name,
      };

      if (this.loadBalancer.selectedVnet) {
        this.loadBalancer.vnet = this.loadBalancer.selectedVnet.name;
        this.loadBalancer.vnetResourceGroup = this.loadBalancer.selectedVnet.resourceGroup;
      }

      if (this.loadBalancer.selectedSubnet) {
        this.loadBalancer.subnet = this.loadBalancer.selectedSubnet.name;
      }

      this.loadBalancer.type = 'upsertLoadBalancer';
      if (!this.loadBalancer.vnet && !this.loadBalancer.subnetType) {
        this.loadBalancer.securityGroups = null;
      }

      /*const name = this.loadBalancer.clusterName || this.loadBalancer.name;
      const probeName = name + '-probe';
      var ruleNameBase = name + '-rule';
      this.loadBalancer.probes[0].probeName = probeName;

      this.loadBalancer.loadBalancingRules.forEach((rule, index) => {
        rule.ruleName = ruleNameBase + index;
        rule.probeName = probeName;
      });

      if (this.loadBalancer.probes[0].probeProtocol === 'TCP') {
        this.loadBalancer.probes[0].probePath = undefined;
      }*/

      return LoadBalancerWriter.upsertLoadBalancer(this.loadBalancer, this.application, descriptor, params);
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

/*
module.exports = angular
  .module('spinnaker.oracle.loadBalancer.create.controller', [
    require('@uirouter/angularjs').default,
    require('../loadBalancer.transformer').name,
  ])
  .controller('oracleCreateLoadBalancerCtrl', function(
    $scope,
    $uibModalInstance,
    $state,
    oracleLoadBalancerTransformer,
    application,
    loadBalancer,
    isNew,
  ) {
    var ctrl = this;

    $scope.pages = {
      location: require('./createLoadBalancerProperties.html'),
      listeners: require('./listeners.html'),
      healthCheck: require('./healthCheck.html'),
    };

    $scope.isNew = isNew;

    $scope.state = {
      accountsLoaded: false,
      submitting: false,
    };

    function onApplicationRefresh() {
      // If the user has already closed the modal, do not navigate to the new details view
      if ($scope.$$destroyed) {
        return;
      }
      $uibModalInstance.close();
      var newStateParams = {
        name: $scope.loadBalancer.name,
        accountId: $scope.loadBalancer.credentials,
        region: $scope.loadBalancer.region,
        provider: 'oracle',
      };

      if (!$state.includes('**.loadBalancerDetails')) {
        $state.go('.loadBalancerDetails', newStateParams);
      } else {
        $state.go('^.loadBalancerDetails', newStateParams);
      }
    }

    function onTaskComplete() {
      application.loadBalancers.refresh();
      application.loadBalancers.onNextRefresh($scope, onApplicationRefresh);
    }

    $scope.taskMonitor = new TaskMonitor({
      application: application,
      title: (isNew ? 'Creating ' : 'Updating ') + 'your load balancer',
      modalInstance: $uibModalInstance,
      onTaskComplete: onTaskComplete,
    });

    function initializeCreateMode() {
      AccountService.listAccounts('oracle').then(function(accounts) {
        $scope.accounts = accounts;
        $scope.state.accountsLoaded = true;
        ctrl.accountUpdated();
      });
    }

    function initializeController() {
      if (loadBalancer) {
        $scope.loadBalancer = oracleLoadBalancerTransformer.convertLoadBalancerForEditing(loadBalancer);
        if (isNew) {
          var nameParts = NameUtils.parseLoadBalancerName($scope.loadBalancer.name);
          $scope.loadBalancer.stack = nameParts.stack;
          $scope.loadBalancer.detail = nameParts.freeFormDetails;
          delete $scope.loadBalancer.name;
        }
      } else {
        $scope.loadBalancer = oracleLoadBalancerTransformer.constructNewLoadBalancerTemplate(application);
      }
      if (isNew) {
        updateLoadBalancerNames();
        initializeCreateMode();
      }
    }

    function updateLoadBalancerNames() {
      var account = $scope.loadBalancer.credentials,
        region = $scope.loadBalancer.region;

      const accountLoadBalancersByRegion = {};
      application
        .getDataSource('loadBalancers')
        .refresh(true)
        .then(() => {
          application.getDataSource('loadBalancers').data.forEach(loadBalancer => {
            if (loadBalancer.account === account) {
              accountLoadBalancersByRegion[loadBalancer.region] =
                accountLoadBalancersByRegion[loadBalancer.region] || [];
              accountLoadBalancersByRegion[loadBalancer.region].push(loadBalancer.name);
            }
          });

          $scope.existingLoadBalancerNames = accountLoadBalancersByRegion[region] || [];
        });
    }

    initializeController();

    this.requiresHealthCheckPath = function() {
      return (
        $scope.loadBalancer.probes[0].probeProtocol && $scope.loadBalancer.probes[0].probeProtocol.indexOf('HTTP') === 0
      );
    };

    this.updateName = function() {
      $scope.loadBalancer.name = this.getName();
    };

    this.getName = function() {
      var elb = $scope.loadBalancer;
      const elbName = [application.name, elb.stack || '', elb.detail || ''].join('-');
      return _.trimEnd(elbName, '-');
    };

    this.accountUpdated = function() {
      AccountService.getRegionsForAccount($scope.loadBalancer.credentials).then(function(regions) {
        $scope.regions = regions;
        ctrl.regionUpdated();
      });
    };

    this.regionUpdated = function() {
      updateLoadBalancerNames();
      ctrl.updateName();
      ctrl.vnetUpdated();
    };

    this.vnetUpdated = function() {
      var account = $scope.loadBalancer.credentials,
        region = $scope.loadBalancer.region;
      $scope.loadBalancer.selectedVnet = null;
      $scope.loadBalancer.vnet = null;
      $scope.loadBalancer.vnetResourceGroup = null;
      ctrl.selectedVnets = [];
      InfrastructureCaches.clearCache('networks');

      NetworkReader.listNetworks().then(function(vnets) {
        if (vnets.oracle) {
          vnets.oracle.forEach(vnet => {
            if (vnet.account === account && vnet.region === region) {
              ctrl.selectedVnets.push(vnet);
            }
          });
        }
      });

      ctrl.subnetUpdated();
    };

    this.subnetUpdated = function() {
      $scope.loadBalancer.selectedSubnet = null;
      $scope.loadBalancer.subnet = null;
      ctrl.selectedSubnets = [];
    };

    this.selectedVnetChanged = function(item) {
      $scope.loadBalancer.vnet = item.name;
      $scope.loadBalancer.vnetResourceGroup = item.resourceGroup;
      $scope.loadBalancer.selectedSubnet = null;
      $scope.loadBalancer.subnet = null;
      ctrl.selectedSubnets = [];
      if (item.subnets) {
        item.subnets.map(function(subnet) {
          var addSubnet = true;
          if (subnet.devices) {
            subnet.devices.map(function(device) {
              if (device && device.type !== 'applicationGateways') {
                addSubnet = false;
              }
            });
          }
          if (addSubnet) {
            ctrl.selectedSubnets.push(subnet);
          }
        });
      }
    };

    this.removeListener = function(index) {
      $scope.loadBalancer.loadBalancingRules.splice(index, 1);
    };

    this.addListener = function() {
      $scope.loadBalancer.loadBalancingRules.push({ protocol: 'HTTP' });
    };

    this.submit = function() {
      var descriptor = isNew ? 'Create' : 'Update';

      $scope.taskMonitor.submit(function() {
        let params = {
          cloudProvider: 'oracle',
          appName: application.name,
          clusterName: $scope.loadBalancer.clusterName,
          resourceGroupName: $scope.loadBalancer.clusterName,
          loadBalancerName: $scope.loadBalancer.name,
        };

        if ($scope.loadBalancer.selectedVnet) {
          $scope.loadBalancer.vnet = $scope.loadBalancer.selectedVnet.name;
          $scope.loadBalancer.vnetResourceGroup = $scope.loadBalancer.selectedVnet.resourceGroup;
        }

        if ($scope.loadBalancer.selectedSubnet) {
          $scope.loadBalancer.subnet = $scope.loadBalancer.selectedSubnet.name;
        }

        var name = $scope.loadBalancer.clusterName || $scope.loadBalancer.name;
        var probeName = name + '-probe';
        var ruleNameBase = name + '-rule';
        $scope.loadBalancer.type = 'upsertLoadBalancer';
        if (!$scope.loadBalancer.vnet && !$scope.loadBalancer.subnetType) {
          $scope.loadBalancer.securityGroups = null;
        }

        $scope.loadBalancer.probes[0].probeName = probeName;

        $scope.loadBalancer.loadBalancingRules.forEach((rule, index) => {
          rule.ruleName = ruleNameBase + index;
          rule.probeName = probeName;
        });

        if ($scope.loadBalancer.probes[0].probeProtocol === 'TCP') {
          $scope.loadBalancer.probes[0].probePath = undefined;
        }

        return LoadBalancerWriter.upsertLoadBalancer($scope.loadBalancer, application, descriptor, params);
      });
    };

    this.cancel = function() {
      $uibModalInstance.dismiss();
    };
  });
*/
