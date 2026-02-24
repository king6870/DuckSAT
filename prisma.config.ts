import { defineConfig } from '@prisma/config'

export default defineConfig({
  schema: './prisma/schema.prisma',
  client: {
    generator: false, // disables auto-generation during npm install
  },
})
