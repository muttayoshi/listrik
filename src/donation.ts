export interface CoffeeOption {
  id: string
  name: string
  subtitle: string
  price: number
  emoji: string
  gradientFrom: string
  gradientTo: string
}

export const COFFEE_OPTIONS: CoffeeOption[] = [
  {
    id: 'tuku',
    name: 'Kopi Tuku',
    subtitle: 'Kopi Susu Tetangga',
    price: 18000,
    emoji: '☕',
    gradientFrom: '#78350f',
    gradientTo: '#b45309',
  },
  {
    id: 'familymart',
    name: 'Kopi Family Mart',
    subtitle: 'Kopi Susu Keluarga',
    price: 15000,
    emoji: '🥤',
    gradientFrom: '#0f766e',
    gradientTo: '#0d9488',
  },
  {
    id: 'pointcoffee',
    name: 'Point Coffee',
    subtitle: 'Himalayan Butterscotch',
    price: 23000,
    emoji: '☕',
    gradientFrom: '#6d28d9',
    gradientTo: '#a855f7',
  },
]
