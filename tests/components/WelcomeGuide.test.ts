import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { playgroundConfig } from '../../app/playground.config'
import WelcomeGuide from '../../app/components/WelcomeGuide.vue'

describe('WelcomeGuide', () => {
  const mountOptions = {
    global: {
      stubs: {
        UIcon: { template: '<span class="icon" />' }
      }
    }
  }

  it('renders the app name', () => {
    const wrapper = mount(WelcomeGuide, mountOptions)
    expect(wrapper.text()).toContain(playgroundConfig.app.name)
  })

  it('renders example endpoints', () => {
    const wrapper = mount(WelcomeGuide, mountOptions)
    for (const ep of playgroundConfig.exampleEndpoints) {
      expect(wrapper.text()).toContain(ep.url)
      expect(wrapper.text()).toContain(ep.description)
    }
  })

  it('shows keyboard shortcuts', () => {
    const wrapper = mount(WelcomeGuide, mountOptions)
    expect(wrapper.text()).toContain('Ctrl+Enter')
    expect(wrapper.text()).toContain('Ctrl+Space')
  })

  it('emits connect event with URL and example query when clicked', async () => {
    const wrapper = mount(WelcomeGuide, mountOptions)

    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBeGreaterThan(0)

    await buttons[0].trigger('click')
    const ep = playgroundConfig.exampleEndpoints[0]
    expect(wrapper.emitted('connect')).toBeTruthy()
    expect(wrapper.emitted('connect')![0]).toEqual([ep.url, ep.exampleQuery])
  })

  it('instructs user to enter an endpoint', () => {
    const wrapper = mount(WelcomeGuide, mountOptions)
    expect(wrapper.text()).toContain('Enter a GraphQL endpoint URL')
  })
})
