import { QuadraticBezierLine } from '@react-three/drei'

export default function CausalConnection({ start, end, isHighlighted, color }) {
  const mid = [
    (start[0] + end[0]) / 2 * 1.12,
    (start[1] + end[1]) / 2 + 4,
    (start[2] + end[2]) / 2 * 1.12,
  ]

  return (
    <QuadraticBezierLine
      start={start}
      end={end}
      mid={mid}
      color={isHighlighted ? color : '#b0b8c8'}
      lineWidth={isHighlighted ? 2 : 0.8}
      transparent
      opacity={isHighlighted ? 0.9 : 0.12}
    />
  )
}
