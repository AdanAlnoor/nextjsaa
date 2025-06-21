import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '../error-boundary'

describe('ErrorBoundary', () => {
  const mockError = new Error('Test error')
  const mockReset = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders error message when there is an error', () => {
    render(
      <ErrorBoundary 
        error={mockError} 
        reset={mockReset}
        componentName="Test Component"
      >
        <div>Child content</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong in Test Component')).toBeInTheDocument()
    expect(screen.getByText('Test error')).toBeInTheDocument()
  })

  it('calls reset function when try again button is clicked', () => {
    render(
      <ErrorBoundary 
        error={mockError} 
        reset={mockReset}
        componentName="Test Component"
      >
        <div>Child content</div>
      </ErrorBoundary>
    )

    fireEvent.click(screen.getByText('Try again'))
    expect(mockReset).toHaveBeenCalledTimes(1)
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary 
        error={null as any} 
        reset={mockReset}
        componentName="Test Component"
      >
        <div>Child content</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Child content')).toBeInTheDocument()
  })
}) 