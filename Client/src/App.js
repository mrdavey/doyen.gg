import React, { useState, useEffect } from 'react'
import { Box, Button, Heading, Text } from 'grommet'

function App() {
  const [userObj, setUserObj] = useState(null)

  const ActionButtons = () => {
    if (userObj) {
      return (
        <Box pad={{ vertical: 'small' }} align='start'>
          <Button primary label='Signed In' />
        </Box>
      )
    } else {
      return (
        <Box pad={{ vertical: 'small' }} align='start'>
          <Button primary label='Sign In' />
        </Box>
      )
    }
  }

  return (
    <Box pad='medium'>
      <Heading level={3}>Doyen.gg ⚡️</Heading>
      <Box pad='small'>
        <Text>Welcome!</Text>
        <ActionButtons />
      </Box>
    </Box>
  )
}

export default App;
