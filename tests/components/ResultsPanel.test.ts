import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ResultsPanel from '../../app/components/ResultsPanel.vue'

// Mock the auto-imported store
const mockActiveTab = { value: null as any }

vi.stubGlobal('useWorkspaceStore', () => ({
  get activeTab() {
    return mockActiveTab.value
  }
}))

describe('ResultsPanel', () => {
  const mountOptions = {
    global: {
      stubs: {
        UIcon: { template: '<span class="icon" />' },
        UButton: {
          template: '<button @click="$emit(\'click\')">{{ label }}</button>',
          props: ['label', 'icon', 'variant', 'color', 'size', 'trailing-icon']
        },
        UDropdownMenu: {
          template: '<div class="dropdown"><slot /></div>',
          props: ['items']
        }
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockActiveTab.value = null
  })

  it('shows placeholder when no results', () => {
    mockActiveTab.value = { results: null }
    const wrapper = mount(ResultsPanel, mountOptions)
    expect(wrapper.text()).toContain('Play Button')
  })

  it('shows results when available', () => {
    const jsonResult = JSON.stringify({ data: { users: [{ id: 1 }] } }, null, 2)
    mockActiveTab.value = { results: jsonResult, name: 'Test Tab' }
    const wrapper = mount(ResultsPanel, mountOptions)
    expect(wrapper.text()).toContain('users')
  })

  it('shows copy and download buttons when results exist', () => {
    mockActiveTab.value = { results: '{"data": {}}', name: 'Test Tab' }
    const wrapper = mount(ResultsPanel, mountOptions)
    expect(wrapper.text()).toContain('Copy')
    expect(wrapper.text()).toContain('Download')
  })

  it('hides copy and download buttons when no results', () => {
    mockActiveTab.value = { results: null }
    const wrapper = mount(ResultsPanel, mountOptions)
    expect(wrapper.text()).not.toContain('Download')
    expect(wrapper.text()).not.toContain('Copy')
  })
})
