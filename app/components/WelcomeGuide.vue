<!-- app/components/WelcomeGuide.vue -->
<template>
  <div class="h-full flex items-center justify-center bg-gray-900 p-8">
    <div class="max-w-lg space-y-6 text-center">
      <div>
        <UIcon name="i-lucide-braces" class="text-5xl text-primary-400 mb-3" />
        <h2 class="text-xl font-semibold text-white">{{ config.app.name }}</h2>
        <p class="text-sm text-gray-400 mt-1">
          Enter a GraphQL endpoint URL above to get started
        </p>
      </div>

      <div class="text-left space-y-3">
        <h3 class="text-xs uppercase tracking-wider text-gray-500 font-semibold">Quick Start</h3>
        <ol class="space-y-2 text-sm text-gray-300">
          <li class="flex gap-2">
            <span class="text-primary-400 font-bold shrink-0">1.</span>
            Paste a GraphQL endpoint URL in the bar above
          </li>
          <li class="flex gap-2">
            <span class="text-primary-400 font-bold shrink-0">2.</span>
            Click <strong>Connect</strong> to connect to the endpoint
          </li>
          <li class="flex gap-2">
            <span class="text-primary-400 font-bold shrink-0">3.</span>
            Write a query and press
            <kbd class="px-1 py-0.5 bg-gray-800 rounded text-xs font-mono">Ctrl+Enter</kbd>
            to execute
          </li>
        </ol>
      </div>

      <div class="text-left space-y-2">
        <h3 class="text-xs uppercase tracking-wider text-gray-500 font-semibold">Try an Example</h3>
        <p class="text-xs text-gray-500">Click to connect and load a sample query you can run immediately.</p>
        <div v-for="ep in config.exampleEndpoints" :key="ep.url" class="group">
          <button
            class="w-full text-left p-2 rounded bg-gray-800/50 hover:bg-gray-800 transition-colors"
            @click="$emit('connect', ep.url, ep.exampleQuery)"
          >
            <p class="text-sm text-primary-400 font-mono truncate">{{ ep.url }}</p>
            <p class="text-xs text-gray-500 mt-0.5">{{ ep.description }}</p>
          </button>
        </div>
      </div>

      <div class="text-left space-y-2">
        <h3 class="text-xs uppercase tracking-wider text-gray-500 font-semibold">Keyboard Shortcuts</h3>
        <div class="grid grid-cols-2 gap-1 text-xs text-gray-400">
          <div>
            <kbd class="px-1 py-0.5 bg-gray-800 rounded font-mono">Ctrl+Enter</kbd>
          </div>
          <div>Execute query</div>
          <div>
            <kbd class="px-1 py-0.5 bg-gray-800 rounded font-mono">Ctrl+Space</kbd>
          </div>
          <div>Autocomplete</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { playgroundConfig as config } from '~/playground.config'

defineEmits<{
  connect: [url: string, exampleQuery?: string]
}>()
</script>
