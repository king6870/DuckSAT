const prismaConfig = {
  datasource: {
    provider: 'sqlserver',
    url: process.env.DATABASE_URL,
  },
}

export default prismaConfig
