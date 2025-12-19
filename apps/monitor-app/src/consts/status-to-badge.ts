export const statusToBadge = {
  good: {
    label: 'Good',
    defaultIcon: true,
    type: 'success'
  },
  'needs-improvement': {
    label: 'Needs improvement',
    defaultIcon: true,
    type: 'warning'
  },
  poor: {
    label: 'Poor',
    defaultIcon: true,
    type: 'error'
  }
} as const;
