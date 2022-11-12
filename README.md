# apollo-pusher-link

## Installation

```bash
yarn add apollo-pusher-link
# or
npm i apollo-pusher-link
```

## Configuration

```ts
import { from } from '@apollo/client'
import Pusher from 'pusher-js'

const pusherClient = new Pusher(APP_KEY, {
  cluster: APP_CLUSTER,
  authEndpoint: AUTH_ENDPOINT,
})

const pusherLink = new PusherLink({ pusher: pusherClient })

const link = from([
  pusherLink,
  // ... other links
])

const client = new ApolloClient({
  link,
  // Provide required constructor fields
  // uri:
  // cache:
})
```

## Usage

```ts
const subscription = client.subscribe({
  variables: { /*variables*/ },
  query: gql`
    subscription someSubscription {
      someSubscription {
        id
      }
    }
`,
})

const unsubscribe = subscription.subscribe({ next: ({ data, errors }) => {
  // Do something
}})

// unsubscribe() /*run unsubscribe when needed*/ 
```

## License

[MIT](https://choosealicense.com/licenses/mit/)
