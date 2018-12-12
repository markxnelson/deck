import { FormikErrors } from 'formik';
import * as React from 'react';
import { Application, IWizardPageProps, SubnetReader, wizardPage } from '@spinnaker/core';

import { IOracleFirewall } from '../../domain/IOracleFirewall';
import { IOracleSubnet } from '../../domain/IOracleLoadBalancer';

export interface IOracleFirewallSubnetAttachmentsProps extends IWizardPageProps<IOracleFirewall> {
  application: Application;
  vpcId: string;
  // selectedSubnetIds: []
}

export interface IOracleFirewallSubnetAttachmentsState {
  allSubnets: IOracleSubnet[];
  // selectedSubnetIds: Set<string>;
}

const ORACLE = 'oracle';

class OracleFirewallSubnetAttachmentsComponent extends React.Component<
  IOracleFirewallSubnetAttachmentsProps,
  IOracleFirewallSubnetAttachmentsState
> {
  public static LABEL = 'Attach to Subnets';

  constructor(props: IOracleFirewallSubnetAttachmentsProps) {
    super(props);
    this.state = {
      allSubnets: [],
      // selectedSubnetIds: new Set(props.selectedSubnetIds || []) // use Set for uniqueness
    };
  }

  public componentDidMount(): void {
    SubnetReader.listSubnetsByProvider(ORACLE).then((subnets: IOracleSubnet[]) => {
      this.setState({ allSubnets: subnets });
    });
  }

  public subnetSelectionChanged = (subnetId: string, selected: boolean) => {
    // use Set so we don't have to manually enforce uniqueness
    const selectedSubnetIds = new Set(this.props.formik.values.subnetIds || []);
    selected ? selectedSubnetIds.add(subnetId) : selectedSubnetIds.delete(subnetId);
    this.props.formik.setFieldValue('subnetIds', Array.from(selectedSubnetIds));
  };

  public validate(values: IOracleFirewall) {
    const errors = {} as FormikErrors<IOracleFirewall>;

    /*if (values.name && values.name.length > 32) {
      errors.name = 'Firewall names cannot exceed 32 characters in length';
    }*/

    return errors;
  }

  public render() {
    const { allSubnets } = this.state;
    // const { selectedSubnetIds } = this.props;
    const { vpcId, subnetIds } = this.props.formik.values;

    const filteredSubnets = allSubnets.filter((s: IOracleSubnet) => s.vcnId === vpcId);
    return (
      <div>
        <strong>
          Select Subnets this Firewall Applies to TODO!!!!! this is always one click behind the actual values!!!!
        </strong>
        <table className="table table-condensed packed">
          <thead>
            <tr>
              <th>Select</th>
              <th>Subnet</th>
            </tr>
            {filteredSubnets.map(v => (
              <tr key={v.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={!!subnetIds.includes(v.id)}
                    onChange={(evt: React.ChangeEvent<HTMLInputElement>) => {
                      evt.preventDefault();
                      this.subnetSelectionChanged(v.id, evt.target.checked);
                    }}
                  />
                </td>
                <td>{v.name}</td>
              </tr>
            ))}
          </thead>
        </table>
      </div>
    );
    /*<div className="form-group">
        <div className="col-md-3 sm-label-right">Subnet</div>
        <div className="col-md-7">
          <select
            className="form-control input-sm inline-number"
            style={{ width: '80px' }}
            value="hellosubnet"
            onChange={event =>
              this.subnetChanged(event.target.value as string)
            }
          >
            {filteredSubnets.map(v => (
              <option key={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
      </div>*/
  }
}

export const OracleFirewallSubnetAttachments = wizardPage(OracleFirewallSubnetAttachmentsComponent);
