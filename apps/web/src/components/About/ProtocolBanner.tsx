import { ButtonEmpty } from 'components/Button'
import styled from 'styled-components'
import { BREAKPOINTS } from 'theme'
import { useIsDarkMode } from 'theme/components/ThemeToggle'

import meshSrc from './images/Mesh.png'

const DARK_MODE_GRADIENT =
  'linear-gradient(125deg, rgba(250, 247, 227, 0.12) 0%, rgba(250, 247, 227, 0.03) 100%), #3b3c3a'
const LIGHT_MODE_GRADIENT =
  'linear-gradient(110deg, rgba(19, 62, 82, 0.92) 0%, rgba(45, 73, 86, 0.88) 100%), #133e52'

const Banner = styled.div<{ isDarkMode: boolean }>`
  height: 340px;
  width: 100%;
  border-radius: 32px;
  max-width: 1440px;
  margin: 80px 0;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 32px 48px;

  box-shadow: 0px 10px 24px rgba(51, 53, 72, 0.04);

  background: ${({ isDarkMode }) =>
    isDarkMode ? `url(${meshSrc}), ${DARK_MODE_GRADIENT}` : `url(${meshSrc}), ${LIGHT_MODE_GRADIENT}`};

  @media screen and (min-width: ${BREAKPOINTS.lg}px) {
    height: 140px;
    flex-direction: row;
  }
`

const TextContainer = styled.div`
  color: ${({ theme }) => theme.white};
  display: flex;
  flex: 1;
  flex-direction: column;
`

const HeaderText = styled.div`
  font-weight: 535;
  font-size: 28px;
  line-height: 36px;

  @media screen and (min-width: ${BREAKPOINTS.xl}px) {
    font-size: 28px;
    line-height: 36px;
  }
`

const DescriptionText = styled.div`
  margin: 10px 10px 0 0;
  font-weight: 535;
  font-size: 16px;
  line-height: 20px;

  @media screen and (min-width: ${BREAKPOINTS.xl}px) {
    font-size: 20px;
    line-height: 28px;
  }
`

const BannerButtonContainer = styled.div`
  width: 100%;
  display: flex;
  align-items: center;

  transition: ${({ theme }) => `${theme.transition.duration.medium} ${theme.transition.timing.ease} opacity`};

  &:hover {
    opacity: 0.6;
  }

  @media screen and (min-width: ${BREAKPOINTS.lg}px) {
    width: auto;
  }
`

const BannerButton = styled(ButtonEmpty)`
  color: ${({ theme }) => theme.white};
  border: 1px solid rgba(250, 247, 227, 0.9);
`

const ProtocolBanner = () => {
  const isDarkMode = useIsDarkMode()
  return (
    <Banner isDarkMode={isDarkMode}>
      <TextContainer>
        <HeaderText>Built for Fenswap</HeaderText>
        <DescriptionText>Swap, provide liquidity, and build applications around the Fenine trading experience.</DescriptionText>
      </TextContainer>
      <BannerButtonContainer>
        <BannerButton width="200px" as="a" href="https://swap.fene.app/docs" rel="noopener noreferrer" target="_blank">
          Open docs
        </BannerButton>
      </BannerButtonContainer>
    </Banner>
  )
}

export default ProtocolBanner
