import { requireNativeView } from 'expo';
import * as React from 'react';

import { Vocab2CSVProcessorViewProps } from './Vocab2CSVProcessor.types';

const NativeView: React.ComponentType<Vocab2CSVProcessorViewProps> =
  requireNativeView('Vocab2CSVProcessor');

export default function Vocab2CSVProcessorView(props: Vocab2CSVProcessorViewProps) {
  return <NativeView {...props} />;
}
