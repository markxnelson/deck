import * as React from 'react';
import { IOracleIngressSecurityRule, IOracleFirewall, IOracleSecurityRuleType } from '../../domain/IOracleFirewall';
import { HelpField, IWizardPageProps, wizardPage } from '@spinnaker/core';
import { OracleSecurityRuleRow } from './OracleSecurityRuleRow';
import { OracleReactInjector } from '../../reactShims';
import { FormikErrors } from 'formik';

export interface IOracleFirewallIngressRuleListProps extends IWizardPageProps<IOracleFirewall> {}

export class OracleIngressRuleListComponent extends React.Component<IOracleFirewallIngressRuleListProps, any> {
  public static LABEL = 'Inbound Security Rules';

  private addRule = (evt: React.MouseEvent<HTMLButtonElement>) => {
    evt.preventDefault();
    const { ingressSecurityRules } = this.props.formik.values;
    ingressSecurityRules.push(OracleReactInjector.oracleFirewallTransformer.constructNewIngressRule());
    this.props.formik.setFieldValue('ingressSecurityRules', ingressSecurityRules);
  };

  private deleteRule = (index: number) => {
    const { ingressSecurityRules } = this.props.formik.values;
    ingressSecurityRules.splice(index, 1);
    this.props.formik.setFieldValue('ingressSecurityRules', ingressSecurityRules);
  };

  private ruleChanged = (index: number, newRule: IOracleIngressSecurityRule) => {
    const { ingressSecurityRules } = this.props.formik.values;
    ingressSecurityRules[index] = newRule;
    this.props.formik.setFieldValue('ingressSecurityRules', ingressSecurityRules);
  };

  public validate(values: IOracleFirewall) {
    const errors = {} as FormikErrors<IOracleFirewall>;

    /*if (values.name && values.name.length > 32) {
      errors.name = 'Firewall names cannot exceed 32 characters in length';
    }*/

    return errors;
  }

  public render() {
    const { ingressSecurityRules } = this.props.formik.values;
    if (!ingressSecurityRules) {
      return <div />;
    }
    const rows: any = ingressSecurityRules.map((securityRule: IOracleIngressSecurityRule, index: number) => (
      <OracleSecurityRuleRow
        securityRule={securityRule}
        securityRuleType={IOracleSecurityRuleType.INGRESS}
        index={index}
        deleteRuleFunction={this.deleteRule}
        ruleChangedFunction={this.ruleChanged}
        key={IOracleSecurityRuleType.INGRESS + 'SecurityRule' + index}
      />
    ));

    return (
      <table className="table table-condensed packed">
        <thead>
          <tr>
            <th>
              Source CIDR <HelpField id="oracle.firewall.cidr" />
            </th>
            <th>Source Type</th>
            <th>Protocol</th>
            <th>Stateless</th>
            <th>
              Source Port Range <HelpField id="oracle.firewall.portRange" />
            </th>
            <th>
              Destination Port Range <HelpField id="oracle.firewall.portRange" />
            </th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
        <tfoot>
          <tr>
            <td colSpan={6}>
              <button className="add-new col-md-12" onClick={this.addRule}>
                <span className="glyphicon glyphicon-plus-sign" />
                Add Inbound Rule
              </button>
            </td>
          </tr>
        </tfoot>
      </table>
    );
  }
}

export const OracleIngressRuleList = wizardPage(OracleIngressRuleListComponent);
