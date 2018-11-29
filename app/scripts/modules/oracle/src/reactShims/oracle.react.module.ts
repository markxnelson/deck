import { module } from 'angular';

import { OracleNgReact } from './oracle.ngReact';
import { OracleReactInjector } from './oracle.react.injector';

export const ORACLE_REACT_MODULE = 'spinnaker.oracle.react';
module(ORACLE_REACT_MODULE, []).run(function($injector: any) {
  // Make angular services importable and (TODO when relevant) convert angular components to react
  OracleReactInjector.initialize($injector);
  OracleNgReact.initialize($injector);
});
