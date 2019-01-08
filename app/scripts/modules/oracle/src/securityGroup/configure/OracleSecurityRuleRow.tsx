import * as React from 'react';
import {
  IOracleIngressSecurityRule,
  IOracleEgressSecurityRule,
  IOracleFirewallDestinationType,
  IOracleFirewallSourceType,
  IOracleSecurityRule,
  IOracleSecurityRuleType,
  IOraclePortRange,
  IOraclePortRangeOptions,
  Protocols,
} from '../../domain/IOracleFirewall';

export interface IOracleSecurityRuleProps {
  securityRule: IOracleSecurityRule;
  securityRuleType: IOracleSecurityRuleType;
  index: number;
  deleteRuleFunction: (index: number) => void;
  ruleChangedFunction: (index: number, newRule: IOracleSecurityRule) => void;
}

export class OracleSecurityRuleRow extends React.Component<IOracleSecurityRuleProps, any> {
  private deleteRule = (evt: React.MouseEvent<HTMLAnchorElement>) => {
    evt.preventDefault();
    this.props.deleteRuleFunction(this.props.index);
  };

  private locationChanged = (evt: React.ChangeEvent<HTMLInputElement>): void => {
    evt.preventDefault();
    const newValue = evt.target.value;
    const { index, securityRule, securityRuleType } = this.props;
    if (securityRuleType === IOracleSecurityRuleType.INGRESS) {
      (securityRule as IOracleIngressSecurityRule).source = newValue;
    } else {
      (securityRule as IOracleEgressSecurityRule).destination = newValue;
    }
    this.props.ruleChangedFunction(index, securityRule);
  };

  private locationTypeChanged = (evt: React.ChangeEvent<HTMLSelectElement>) => {
    evt.preventDefault();
    const newValue: string = evt.target.value;
    const { index, securityRule, securityRuleType } = this.props;
    if (securityRuleType === IOracleSecurityRuleType.INGRESS) {
      (securityRule as IOracleIngressSecurityRule).sourceType = newValue as IOracleFirewallSourceType;
    } else {
      (securityRule as IOracleEgressSecurityRule).destinationType = newValue as IOracleFirewallDestinationType;
    }
    this.props.ruleChangedFunction(index, securityRule);
  };

  private getLocationValue = (): string => {
    const { securityRule, securityRuleType } = this.props;
    return securityRuleType === IOracleSecurityRuleType.INGRESS
      ? (securityRule as IOracleIngressSecurityRule).source
      : (securityRule as IOracleEgressSecurityRule).destination;
  };

  private getLocationTypes = (): any[] => {
    const { securityRuleType } = this.props;
    return securityRuleType === IOracleSecurityRuleType.INGRESS
      ? Object.keys(IOracleFirewallSourceType)
      : Object.keys(IOracleFirewallDestinationType);
  };

  private getLocationTypeValue = (): string => {
    const { securityRule, securityRuleType } = this.props;
    return securityRuleType === IOracleSecurityRuleType.INGRESS
      ? (securityRule as IOracleIngressSecurityRule).sourceType
      : (securityRule as IOracleEgressSecurityRule).destinationType;
  };

  private protocolChanged = (evt: React.ChangeEvent<HTMLSelectElement>) => {
    evt.preventDefault();
    const newValue: string = evt.target.value;
    this.props.securityRule.protocol = newValue;
    this.props.ruleChangedFunction(this.props.index, this.props.securityRule);
  };

  private statelessChanged = (evt: React.ChangeEvent<HTMLInputElement>) => {
    evt.preventDefault();
    const newValue: boolean = Boolean(evt.target.value);
    this.props.securityRule.stateless = newValue;
    this.props.ruleChangedFunction(this.props.index, this.props.securityRule);
  };

  private sourcePortRangeToString = (): string => {
    const portRangeOptions: IOraclePortRangeOptions = this.getPortRangeOptions();
    return portRangeOptions ? this.portRangeToString(portRangeOptions.sourcePortRange) : '';
  };

  private destPortRangeToString = (): string => {
    const portRangeOptions: IOraclePortRangeOptions = this.getPortRangeOptions();
    return portRangeOptions ? this.portRangeToString(portRangeOptions.destinationPortRange) : '';
  };

  private sourcePortRangeChanged = (evt: React.ChangeEvent<HTMLInputElement>) => {
    evt.preventDefault();
    const portRange: IOraclePortRange = this.portRangeFromString(evt.target.value);
    this.getPortRangeOptions().sourcePortRange = portRange;
    this.props.ruleChangedFunction(this.props.index, this.props.securityRule);
  };

  private destPortRangeChanged = (evt: React.ChangeEvent<HTMLInputElement>) => {
    evt.preventDefault();
    const portRange: IOraclePortRange = this.portRangeFromString(evt.target.value);
    this.getPortRangeOptions().destinationPortRange = portRange;
    this.props.ruleChangedFunction(this.props.index, this.props.securityRule);
  };

  private getPortRangeOptions = (): IOraclePortRangeOptions => {
    const { securityRule } = this.props;
    if (securityRule.protocol === 'TCP' && securityRule.tcpOptions) {
      return securityRule.tcpOptions;
    } else if (securityRule.protocol === 'UDP' && securityRule.udpOptions) {
      return securityRule.udpOptions;
    } else {
      return undefined;
    }
  };

  private portRangeToString = (portRangeOpts: IOraclePortRange): string => {
    if (portRangeOpts.min === portRangeOpts.max) {
      return String(portRangeOpts.min);
    }
    return [portRangeOpts.min, portRangeOpts.max].join('-');
  };

  private portRangeFromString = (portRangeStr: string): IOraclePortRange => {
    // TODO desagar validations
    if (!portRangeStr || portRangeStr === 'All') {
      return undefined;
    }
    let portRange: IOraclePortRange;
    const minMax: string[] = portRangeStr.split('-');
    if (minMax.length === 1) {
      portRange = { min: Number(minMax[0]), max: Number(minMax[0]) };
    } else if (minMax.length === 2) {
      portRange = { min: Number(minMax[0]), max: Number(minMax[1]) };
    }
    return portRange;
  };

  public render() {
    const { securityRule } = this.props;
    return (
      <tr>
        <td>
          <input
            className="form-control input-sm target-group-name"
            type="text"
            value={this.getLocationValue()}
            onChange={this.locationChanged}
            required={true}
          />
        </td>
        <td>
          <select
            className="form-control input-sm inline-number"
            style={{ width: '80px' }}
            value={this.getLocationTypeValue()}
            onChange={this.locationTypeChanged}
          >
            {this.getLocationTypes().map(v => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </td>
        <td>
          <select
            className="form-control input-sm inline-number"
            style={{ width: '80px' }}
            value={securityRule.protocol}
            onChange={this.protocolChanged}
          >
            {Object.keys(Protocols).map(v => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </td>
        <td>
          <input type="checkbox" checked={securityRule.stateless} onChange={this.statelessChanged} />
        </td>
        <td>
          <input
            className="form-control input-sm target-group-name"
            type="text"
            onBlur={this.sourcePortRangeChanged}
            required={false}
          />
        </td>
        <td>
          <input
            className="form-control input-sm target-group-name"
            type="text"
            onBlur={this.destPortRangeChanged}
            required={false}
          />
        </td>
        <td>
          <a href="" className="sm-label" onClick={this.deleteRule}>
            <span className="glyphicon glyphicon-trash" />
          </a>
        </td>
      </tr>
    );
  }
}
