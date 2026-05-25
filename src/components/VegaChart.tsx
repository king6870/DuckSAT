'use client'

import { VegaEmbed } from 'react-vega'

interface VegaChartProps {
  spec: Record<string, unknown>
}

export default function VegaChart({ spec }: VegaChartProps) {
  return <VegaEmbed spec={spec} options={{ actions: false }} />
}