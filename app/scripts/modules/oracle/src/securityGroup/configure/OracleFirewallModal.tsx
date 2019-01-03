import * as React from 'react';
import { cloneDeep } from 'lodash';
import {
  Application,
  IWizardModalProps,
  ReactModal,
  SecurityGroupWriter,
  TaskMonitor,
  WizardModal,
  noop,
} from '@spinnaker/core';

import { IOracleFirewall } from '../../domain/IOracleFirewall';
import { OracleFirewallLocation } from './OracleFirewallLocation';
import { OracleFirewallSubnetAttachments } from './OracleFirewallSubnetAttachments';
import { OracleReactInjector } from '../../reactShims';
import { OracleIngressRuleList } from './OracleIngressRuleList';
import { OracleEgressRuleList } from './OracleEgressRuleList';

export interface IOracleFirewallState {
  firewallCommand: IOracleFirewall;
  isNew?: boolean;
  taskMonitor: TaskMonitor;
}

export interface IOracleFirewallModalProps extends IWizardModalProps<IOracleFirewall> {
  heading: string;
  application: Application;
  firewall?: IOracleFirewall;
  dialogClassName: string;
}

export class OracleFirewallModal extends React.Component<IOracleFirewallModalProps, IOracleFirewallState> {
  public static defaultProps: Partial<IOracleFirewallModalProps> = {
    closeModal: noop,
    dismissModal: noop,
  };

  public static show(props: IOracleFirewallModalProps): Promise<void> {
    const modalProps = { dialogClassName: 'wizard-modal modal-lg' };
    return ReactModal.show(OracleFirewallModal, props, modalProps);
  }

  private _isUnmounted = true;
  private refreshUnsubscribe = (): void => {};

  constructor(props: IOracleFirewallModalProps) {
    super(props);
    this.state = {
      isNew: !this.props.firewall,
      firewallCommand: this.props.firewall
        ? this.props.firewall
        : OracleReactInjector.oracleFirewallTransformer.constructNewFirewallTemplate(props.application),
      taskMonitor: null,
    };
  }

  public componentWillUnmount(): void {
    this._isUnmounted = true;
    if (this.refreshUnsubscribe) {
      this.refreshUnsubscribe();
    }
  }

  public close = (): void => {
    this.props.dismissModal.apply(null, arguments);
  };

  public validate = (): void => {};

  public submit = (values: IOracleFirewall): void => {
    const { application, closeModal } = this.props;
    const { isNew } = this.state;

    const descriptor = isNew ? 'Create' : 'Update';
    const firewallToUpsert = cloneDeep(values);

    const taskMonitor = new TaskMonitor({
      application: application,
      title: `${isNew ? 'Creating' : 'Updating'} your firewall`,
      modalInstance: TaskMonitor.modalInstanceEmulation(() => this.props.dismissModal()),
      onTaskComplete: () => this.onTaskComplete(firewallToUpsert),
    });

    taskMonitor.submit(() => {
      return SecurityGroupWriter.upsertSecurityGroup(firewallToUpsert, application, descriptor);
    });

    this.setState({ taskMonitor });
  };

  private onTaskComplete(values: IOracleFirewall): void {
    // TODO desagar how to refresh the security groups??
  }

  /*
  protected onApplicationRefresh(values: IOracleFirewall): void {
    if (this._isUnmounted) {
      return;
    }

    this.refreshUnsubscribe = undefined;
    this.props.dismissModal();
    this.setState({ taskMonitor: undefined });
    const newStateParams = {
      name: values.name,
      accountId: values.credentials,
      region: values.region,
      vpcId: values.vpcId,
      provider: 'aws',
    };

    if (!ReactInjector.$state.includes('**.loadBalancerDetails')) {
      ReactInjector.$state.go('.loadBalancerDetails', newStateParams);
    } else {
      ReactInjector.$state.go('^.loadBalancerDetails', newStateParams);
    }
  }
  */

  public render() {
    const { application, heading, dismissModal, taskMonitor } = this.props;
    const { isNew, firewallCommand } = this.state;

    return (
      <WizardModal<IOracleFirewall>
        heading={heading}
        initialValues={firewallCommand}
        taskMonitor={taskMonitor}
        dismissModal={dismissModal}
        closeModal={this.submit}
        submitButtonLabel={isNew ? 'Create' : 'Update'}
        validate={this.validate}
      >
        <OracleFirewallLocation application={application} name={firewallCommand.name} />
        <OracleIngressRuleList />
        <OracleEgressRuleList />
        <OracleFirewallSubnetAttachments
          application={application}
          name={firewallCommand.name}
          subnetIds={firewallCommand.subnetIds}
        />
      </WizardModal>
    );
    /*
    <OracleFirewallSecList application={application} isNew={isNew} selectedAccountName={firewallCommand.credentials} selectedRegionName={firewallCommand.region}/>

    <SecurityRules isNew={isNew}
                       ingressSecurityRules={firewallCommand.ingressSecurityRules}
                       egressSecurityRules={firewallCommand.egressSecurityRules}/>
     */
  }
}
