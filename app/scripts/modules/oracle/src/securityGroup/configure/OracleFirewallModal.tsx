import * as React from 'react';

import { Application, IWizardModalProps, ReactModal, TaskMonitor, WizardModal, noop } from '@spinnaker/core';

import { IOracleFirewall } from '../../domain/IOracleFirewall';
import { OracleFirewallLocation } from './OracleFirewallLocation';
import { OracleReactInjector } from '../../reactShims';

export interface IOracleFirewallState {
  firewallCommand: IOracleFirewall;
  isNew?: boolean;
}

export interface IOracleFirewallModalProps extends IWizardModalProps<IOracleFirewall> {
  heading: string;
  application: Application;
  firewall?: IOracleFirewall;
  taskMonitor: TaskMonitor;
}

export class OracleFirewallModal extends React.Component<IOracleFirewallModalProps, IOracleFirewallState> {
  public static defaultProps: Partial<IOracleFirewallModalProps> = {
    closeModal: noop,
    dismissModal: noop,
  };

  public static show(props: IOracleFirewallModalProps): Promise<void> {
    return ReactModal.show(OracleFirewallModal, {
      ...props,
      //      dialogClassName: 'wizard-modal modal-lg',
    });
  }

  constructor(props: IOracleFirewallModalProps) {
    super(props);
    this.state = {
      firewallCommand: this.props.firewall
        ? this.props.firewall
        : OracleReactInjector.oracleFirewallTransformer.constructNewFirewallTemplate(props.application),
    };
  }

  public close = (): void => {
    this.props.dismissModal.apply(null, arguments);
  };

  public submit = (): void => {};

  public validate = (): void => {};

  public render() {
    const { application, heading, initialValues, dismissModal, taskMonitor } = this.props;
    const { isNew } = this.state;

    return (
      <WizardModal<IOracleFirewall>
        heading={heading}
        initialValues={initialValues}
        taskMonitor={taskMonitor}
        dismissModal={dismissModal}
        closeModal={this.submit}
        submitButtonLabel={isNew ? 'Create' : 'Update'}
        validate={this.validate}
      >
        <OracleFirewallLocation application={application} isNew={isNew} />
      </WizardModal>
    );
    /*
    <SecurityRules isNew={isNew}
                       ingressSecurityRules={firewallCommand.ingressSecurityRules}
                       egressSecurityRules={firewallCommand.egressSecurityRules}/>
     */
  }
}
