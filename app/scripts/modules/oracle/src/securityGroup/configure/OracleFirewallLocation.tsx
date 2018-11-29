import * as React from 'react';
import {
  AccountSelectField,
  AccountService,
  Application,
  HelpField,
  IAccount,
  IRegion,
  // IWizardPage,
  IWizardPageProps,
  RegionSelectField,
  wizardPage,
} from '@spinnaker/core';

import { IOracleFirewall } from '../../domain/IOracleFirewall';

export interface IOracleFirewallLocationProps extends IWizardPageProps<IOracleFirewall> {
  application: Application;
  isNew: boolean;
}

export interface IOracleFirewallLocationState {
  accounts: IAccount[];
  regions: IRegion[];
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
    };
  }

  public componentDidMount(): void {
    AccountService.listAccounts(ORACLE).then((accounts: IAccount[]) => {
      this.setState({ accounts: accounts });
      this.accountChanged();
    });
  }

  private accountChanged = (): void => {
    const { credentials } = this.props.formik.values;
    // TODO desagar need to get credentials out of base IOracleFirewall
    // const credentials = 'myaccount';
    if (credentials) {
      AccountService.getRegionsForAccount(credentials).then((regions: IRegion[]) => {
        this.setState({ regions: regions });
      });
    }
  };

  private accountUpdated = (): void => {};

  private regionUpdated = (): void => {};

  private stackUpdated = (): void => {};

  private detailUpdated = (): void => {};

  public render() {
    const { accounts, regions } = this.state;
    const { values } = this.props.formik;
    return (
      <div>
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
      </div>
    );
    /*
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
           <input
             className="form-control input-sm"
             type="text"
             value={values.freeFormDetails}
             onChange={this.detailUpdated}
           />
         </div>
       </div>
       */
  }
}

export const OracleFirewallLocation = wizardPage(OracleFirewallLocationComponent);
