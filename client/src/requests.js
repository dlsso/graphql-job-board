import { ApolloClient, ApolloLink, HttpLink, InMemoryCache} from 'apollo-boost';
import gql from 'graphql-tag';
import {isLoggedIn, getAccessToken} from "./auth";

const endpointURL = 'http://localhost:9009/graphql';

const authLink = new ApolloLink((operation, forward) => {
  if (isLoggedIn()) {
    operation.setContext({
      headers: {
        'authorization': 'Bearer ' + getAccessToken()
      }
    });
  }
  return forward(operation);
});

const client = new ApolloClient({
  link: ApolloLink.from([
    authLink,
    new HttpLink({uri: endpointURL})
  ]),
  cache: new InMemoryCache()
});

// "Job" must match the resolver
const jobDetailFragment = gql`
  fragment JobDetail on Job {
    id
    title
    company {
      id
      name
    }
    description
  }
`

const creatJobMutation = gql`
  mutation CreateJob($input: CreateJobInput) {
    job: createJob(input: $input) {
      ...JobDetail
    }
  }
  ${jobDetailFragment}
`;

const companyQuery = gql`
  query CompanyQuery($id: ID!) {
    company(id: $id) {
      id
      name
      description
      jobs {
        id
        title
      }
    }
  }
`;

const jobQuery = gql`
  query JobQuery($id: ID!){
    job(id: $id) {
      ...JobDetail
    }
  }
  ${jobDetailFragment}
`;

const jobsQuery = gql`
  query jobsQuery {
    jobs {
      id
      title
      company {
        id
        name
      }
    }
  }
`;

export async function createJob(input) {
  const {data: {job}} = await client.mutate({
    mutation: creatJobMutation,
    variables: {input},
    update: (cache, {data}) => {
      // Create returns job details so we can put that in the cache
      cache.writeQuery({
        // Specifies that we're caching loadJob
        query: jobQuery,
        variables: {id: data.job.id},
        data
      })
    }
  });
  return job;
}

export async function loadCompany(id) {
  const {data: {company}} = await client.query({query: companyQuery, variables:{id}});
  return company;
}

export async function loadJob(id) {
  const {data: {job}} = await client.query({query: jobQuery, variables: {id}});
  return job;
}

export async function loadJobs() {
  const {data: {jobs}} = await client.query({query: jobsQuery, fetchPolicy: 'no-cache'});
  return jobs;
}