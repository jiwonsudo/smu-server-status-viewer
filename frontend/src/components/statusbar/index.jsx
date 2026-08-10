import styled from 'styled-components';

const Background = styled.div `
  width: 80%;
  margin: 20px auto;
  padding: 20px;
  background-color: #f1f1f1;
  border-radius: 20px;
  box-shadow: #868686 2px 2px 5px;
`

const HStack = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const VStack = styled.div`
  display: block;
`;

const Title = styled.a`
  color: black;
  font-size: 1.1em;
  font-weight: 600;
  text-decoration: none;
`;

const Url = styled.div`
  color: #adadad;
  font-size: 0.7em;
`;

const StatusMsg = styled.div`
  
`;

const StatusLight = styled.div`
  width: 1em;
  height: 1em;
  margin-left: 1em;
  border-radius: 50%;
  background-color: ${(props) => props.color};
`

const ResponseTime = styled.div`
  color: #adadad;
  font-size: 0.7em;
`;

const StatusBar = (props) => {
  return (
    <Background>
      <HStack>
        <VStack>
          <Title href={props.href} target='_blank'>{props.title}</Title>
          <Url>{props.url}</Url>
        </VStack>
        <VStack>
          <HStack>
            <StatusMsg>{props.statusMsg}</StatusMsg>
            <StatusLight color={props.statusColor}></StatusLight>
          </HStack>
          <ResponseTime>{props.responseTime}</ResponseTime>
        </VStack>
      </HStack>
    </Background>
  );
};


export default StatusBar;