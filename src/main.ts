import { Plugin } from 'obsidian'

export default class LighthousePlugin extends Plugin {
  async onload() {
    console.log('Loading Lighthouse plugin')

    // Add a simple command to verify the plugin works
    this.addCommand({
      id: 'lighthouse-hello',
      name: 'Say hello',
      callback: () => {
        console.log('Hello from Lighthouse!')
      },
    })
  }

  onunload() {
    console.log('Unloading Lighthouse plugin')
  }
}
