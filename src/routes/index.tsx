import { createFileRoute } from '@tanstack/react-router'
import { SpecWriter } from '../components/SpecWriter'

export const Route = createFileRoute('/')({
  component: SpecWriter,
})
