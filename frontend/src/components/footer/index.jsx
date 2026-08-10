import styled from "styled-components";

const FooterBg = styled.div`
  width: 100vw;
  height: 50px;
  background-color: #333B3D;
  position: absolute;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const FooterText = styled.div`
  color: #D9D9D9;
  font-size: 0.8em;
`;

const Footer = () => {
  return (
    <FooterBg>
      <FooterText>&#169; 2025. Jiwon Jeong All rights reserved.</FooterText>
    </FooterBg>

  );
}

export default Footer;