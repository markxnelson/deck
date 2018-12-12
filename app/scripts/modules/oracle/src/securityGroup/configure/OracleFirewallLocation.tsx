import { Field, FormikErrors } from 'formik';
import { trimEnd } from 'lodash';
import * as React from 'react';
import {
  AccountSelectField,
  AccountService,
  Application,
  HelpField,
  IAccount,
  INetwork,
  IRegion,
  // IWizardPage,
  IWizardPageProps,
  NetworkReader,
  RegionSelectField,
  Spinner,
  ValidationMessage,
  wizardPage,
} from '@spinnaker/core';

import { IOracleFirewall } from '../../domain/IOracleFirewall';
import * as classNames from 'classnames';

export interface IOracleFirewallLocationProps extends IWizardPageProps<IOracleFirewall> {
  name: string;
  application: Application;
}

export interface IOracleFirewallLocationState {
  accounts: IAccount[];
  regions: IRegion[];
  allVcns: INetwork[];
  filteredVcns: INetwork[];
}

const ORACLE = 'oracle';

class OracleFirewallLocationComponent extends React.Component<
  IOracleFirewallLocationProps,
  IOracleFirewallLocationState
> {
  public static LABEL = 'Location';

  constructor(props: IOracleFirewallLocationProps) {
    super(props);
    this.state = {
      accounts: [],
      regions: [],
      allVcns: [],
      filteredVcns: [],
    };
  }

  public componentDidMount(): void {
    AccountService.listAccounts(ORACLE).then((accounts: IAccount[]) => {
      NetworkReader.listNetworksByProvider(ORACLE).then((networks: INetwork[]) => {
        this.setState({ accounts: accounts, allVcns: networks });
        this.accountChanged(accounts);
      });
    });
  }

  private accountChanged = (accounts: IAccount[]): void => {
    let { credentials } = this.props.formik.values;
    if (!credentials || credentials === 'DEFAULT') {
      credentials = accounts.length > 0 ? accounts[0].name : credentials;
    }
    this.accountUpdated(credentials);
  };

  private accountUpdated(credentials: string): void {
    if (credentials) {
      this.props.formik.setFieldValue('credentials', credentials);
      AccountService.getRegionsForAccount(credentials).then((regions: IRegion[]) => {
        let currentRegionName: string = this.props.formik.values.region;
        if (!currentRegionName && regions.length > 0) {
          this.props.formik.setFieldValue('region', regions[0].name);
          currentRegionName = regions[0].name;
        }
        this.setState({
          regions: regions,
          filteredVcns: this.filterVcns(credentials, currentRegionName),
        });
      });
    }
  }

  private regionUpdated = (regionName: string): void => {
    this.props.formik.setFieldValue('region', regionName);
    this.setState({
      filteredVcns: this.filterVcns(this.props.formik.values.credentials, regionName),
    });
  };

  private stackUpdated = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const stack = event.target.value;
    this.props.formik.setFieldValue('stack', stack);
    this.updateName(stack, this.props.formik.values.detail);
  };

  private detailUpdated = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const detail = event.target.value;
    this.props.formik.setFieldValue('detail', detail);
    this.updateName(this.props.formik.values.stack, detail);
  };

  private vcnUpdated = (newVcnId: string): void => {
    const { vpcId } = this.props.formik.values;
    if (vpcId !== newVcnId) {
      this.props.formik.setFieldValue('vpcId', newVcnId);
      // Clear the subnet selection if the VCN changes
      this.props.formik.setFieldValue('subnetIds', []);
    }
  };

  private updateName(stack: string, detail: string): void {
    const { application } = this.props;
    const name = [application.name, stack || '', detail || ''].join('-');

    this.props.formik.setFieldValue('name', trimEnd(name, '-'));
  }

  public validate(values: IOracleFirewall) {
    const errors = {} as FormikErrors<IOracleFirewall>;

    /*if (this.state.existingLoadBalancerNames.includes(values.name)) {
      errors.name = `There is already a load balancer in ${values.credentials}:${values.region} with that name.`;
    }*/

    if (values.name && values.name.length > 32) {
      errors.name = 'Firewall names cannot exceed 32 characters in length';
    }

    if (values.stack && !values.stack.match(/^[a-zA-Z0-9]*$/)) {
      errors.stack = 'Stack can only contain letters and numbers.';
    }

    if (values.detail && !values.detail.match(/^[a-zA-Z0-9-]*$/)) {
      errors.detail = 'Detail can only contain letters, numbers, and dashes.';
    }

    if (!values.vpcId) {
      errors.vpcId = 'VCN is required.';
    }

    return errors;
  }

  private filterVcns(account: string, region: string) {
    if (account && region) {
      return this.state.allVcns.filter((vcn: INetwork) => vcn.region === region && vcn.account === account);
    } else {
      return [];
    }
  }

  public render() {
    const { accounts, regions, filteredVcns } = this.state;
    const { errors, values } = this.props.formik;
    if (!accounts) {
      return (
        <div style={{ height: '200px' }}>
          <Spinner size="medium" />
        </div>
      );
    }

    const className = classNames({
      'col-md-12': true,
      well: true,
      'alert-danger': errors.name,
      'alert-info': !errors.name,
    });

    return (
      <div>
        <div className="form-group">
          <div className={className}>
            <strong>Your firewall will be named: </strong>
            <span>{values.name}</span>
            <HelpField id="oracle.firewall.name" />
            <Field type="text" style={{ display: 'none' }} className="form-control input-sm no-spel" name="name" />
            {errors.name && <ValidationMessage type="error" message={errors.name} />}
          </div>
        </div>
        <div className="form-group">
          <div className="col-md-3 sm-label-right">Account</div>
          <div className="col-md-7">
            <AccountSelectField
              component={values}
              field="credentials"
              accounts={accounts}
              provider={ORACLE}
              onChange={this.accountUpdated}
            />
          </div>
        </div>
        <RegionSelectField
          labelColumns={3}
          component={values}
          field="region"
          account={values.credentials}
          onChange={this.regionUpdated}
          regions={regions}
        />
        <div className="form-group">
          <div className="col-md-3 sm-label-right">
            Stack <HelpField id="oracle.firewall.stack" />
          </div>
          <div className="col-md-7">
            <input className="form-control input-sm" type="text" value={values.stack} onChange={this.stackUpdated} />
          </div>
        </div>
        <div className="form-group">
          <div className="col-md-3 sm-label-right">
            Detail <HelpField id="oracle.firewall.detail" />
          </div>
          <div className="col-md-7">
            <input className="form-control input-sm" type="text" value={values.detail} onChange={this.detailUpdated} />
          </div>
        </div>
        <div className="form-group">
          <div className="col-md-3 sm-label-right">Virtual Network</div>
          <div className="col-md-7">
            <select
              className="form-control input-sm inline-number"
              style={{ width: '80px' }}
              value={values.vpcId}
              onChange={event => this.vcnUpdated(event.target.value as string)}
            >
              {filteredVcns.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  }
}

export const OracleFirewallLocation = wizardPage(OracleFirewallLocationComponent);
