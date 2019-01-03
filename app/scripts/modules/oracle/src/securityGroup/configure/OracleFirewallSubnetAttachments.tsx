import { FieldArray, Field, FastField, FormikErrors } from 'formik';
import * as React from 'react';

import { FormikFormField } from '@spinnaker/core/presentation';
import { Application, IWizardPageProps, SubnetReader, wizardPage } from '@spinnaker/core';

import { IOracleFirewall } from '../../domain/IOracleFirewall';
import { IOracleSubnet } from '../../domain/IOracleLoadBalancer';

export interface IOracleFirewallSubnetAttachmentsProps extends IWizardPageProps<IOracleFirewall> {
  name: string;
  application: Application;
  subnetIds: string[];
}

export interface IOracleFirewallSubnetAttachmentsState {
  allSubnets: IOracleSubnet[];
  selectedSubnets: string[];
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
    const selectedSubnetIds: string[] = this.props.formik.values.subnetIds;
    this.state = {
      allSubnets: [],
      selectedSubnets: this.props.formik.values.subnetIds, //this.subnetIdsToSelectionsMap(selectedSubnetIds)
      // selectedSubnetIds: new Set(props.selectedSubnetIds || []) // use Set for uniqueness
    };
  }

  private subnetIdsToSelectionsMap(selectedSubnetIds: string[]) {
    const selections: { [key: string]: boolean } = {};
    return selectedSubnetIds.reduce((selectionsMap, subnetId) => {
      selectionsMap[subnetId] = true;
      return selectionsMap;
    }, selections);
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
    const subnetIdsArray: string[] = Array.from(selectedSubnetIds);
    this.subnetSel = this.subnetIdsToSelectionsMap(subnetIdsArray);
    this.props.formik.setFieldValue('subnetIds', subnetIdsArray);
    //this.setState({subnetSelections: this.subnetIdsToSelectionsMap(subnetIdsArray)})
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
    const { vpcId } = this.props.formik.values;
    const originallySelectedSubnetIds = this.props.formik.values.subnetIds;
    //const { subnetSelections } = this.state;

    const filteredSubnets = allSubnets.filter((s: IOracleSubnet) => s.vcnId === vpcId);
    //<td>{v.name} {subnetIds.includes(v.id) ? "| selected" : "| (not selected)"} {!!subnetIds.includes(v.id) ? "| <b>checked</b>" : "| (<b>not checked</b>)"}</td>
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
          </thead>
          <tbody>
            <FieldArray
              name="subnetIds"
              render={arrayHelpers => {
                const { subnetIds } = arrayHelpers.form.values;
                return filteredSubnets.map((v, idx) => {
                  return (
                    <tr key={v.id}>
                      <td>
                        <FastField
                          component="input"
                          type="checkbox"
                          checked={!!subnetIds.includes(v.id)}
                          defaultChecked={originallySelectedSubnetIds.includes(v.id)}
                          id={'subnet' + v.id}
                          onChange={(evt: React.ChangeEvent<HTMLInputElement>) => {
                            evt.preventDefault();
                            if (evt.target.checked) {
                              if (!subnetIds.includes(v.id)) {
                                arrayHelpers.push(v.id);
                              }
                            } else {
                              arrayHelpers.remove(idx);
                            }
                            this.setState({ selectedSubnets: arrayHelpers.form.values });
                          }}
                        />
                      </td>
                      <td>{v.name}</td>
                    </tr>
                  );
                });
              }}
            />
          </tbody>
        </table>
      </div>
    );
    /*
    <FormikFormField
                        input={props => {
                          return (<input {...props}
                                         type="checkbox"
                                         checked={!!subnetIds.includes(v.id)}
                                         onChange={(evt: React.ChangeEvent<HTMLInputElement>) => {
                                           evt.preventDefault();
                                           if (evt.target.checked) {
                                             if (!subnetIds.includes(v.id)) {
                                               arrayHelpers.push(v.id);
                                             }
                                           } else {
                                             arrayHelpers.remove(idx);
                                           }
                                           this.setState({selectedSubnets: arrayHelpers.form.values});
                                         }}/>);
                        }
                        }
                      />
     */
    /*<Field component="input" type="checkbox" checked={!!subnetIds.includes(v.id)} id={'subnet' + v.id} onChange={(evt: React.ChangeEvent<HTMLInputElement>) => {
                        evt.preventDefault();
                        if (evt.target.checked) {
                          if (!subnetIds.includes(v.id)) {
                            arrayHelpers.push(v.id);
                          }
                        } else {
                          arrayHelpers.remove(idx);
                        }
                        this.setState({selectedSubnets: arrayHelpers.form.values});
                      }}/>*/
    /*<input
                        type="checkbox"
                        checked={!!subnetIds.includes(v.id)}
                        onChange={(evt: React.ChangeEvent<HTMLInputElement>) => {
                          evt.preventDefault();
                          if (evt.target.checked) {
                            if (!subnetIds.includes(v.id)) {
                              arrayHelpers.push(v.id);
                            }
                          } else {
                            arrayHelpers.remove(idx);
                          }
                        }}
                      />*/
    /*{filteredSubnets.map(v => {
  const checked = this.subnetSel[v.id]; //!!subnetIds.includes(v.id);
  return (
    <tr key={v.id}>
      <td>
        <input
          type="checkbox"
          checked={checked}
          onChange={(evt: React.ChangeEvent<HTMLInputElement>) => {
            evt.preventDefault();
            this.subnetSelectionChanged(v.id, evt.target.checked);
          }}
        />
      </td>
      <td>{v.name} {subnetIds.includes(v.id) ? "| selected" : "| (not selected)"} {checked ? "| <b>checked</b>" : "| (<b>not checked</b>)"}</td>
    </tr>
  );
})}*/
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
