---
title: Anaconda for python
date: 2025-8-13 10:30:00 +0700
categories: [XXX]
tags: [linux, sharing]     
comments: false
---

# Anaconda for Python

**Anaconda** is a powerful Python distribution that simplifies package management and deployment for data science, machine learning, and scientific computing. **Conda** is Anaconda’s package, environment, and dependency manager. It is cross-platform (Windows, macOS, Linux [x86/AARCH64/PPC64LE/s390x]), cross-language (supports Python, R, C/C++, Rust, Go, and more), and ensures package compatibility and environment correctness.

## Anaconda vs Miniconda vs Conda

### Anaconda
- **Full distribution** with GUI and pre-installed packages
- **Large download** (~500MB+)
- **Includes** Anaconda Navigator, Jupyter, Spyder
- **Best for**: Beginners, data scientists who want everything ready

### Miniconda
- **Minimal installer** with just Python and conda
- **Small download** (~50MB)
- **Manual package installation** required
- **Best for**: Experienced users, servers, minimal installations

### Conda
- **Package manager** included in both Anaconda and Miniconda
- **Cross-platform** package and environment management
- **Language agnostic** (not just Python)

## Installation Guide
> Just need to note that, my x86-64 machine using Ubuntu 20.04 (default python version is 3.8)
{: .prompt-warning }
### Installing Miniconda on Linux

```bash
# Download the installer. the base version is 3.9 as you can see
wget https://repo.anaconda.com/miniconda/Miniconda3-py39_25.7.0-2-Linux-x86_64.sh

# Make it executable
chmod +x Miniconda3-py39_25.7.0-2-Linux-x86_64.sh

# Run the installer and Follow the prompts
./Miniconda3-py39_25.7.0-2-Linux-x86_64.sh
```


### Post-Installation Setup

After installation, restart your terminal or run:

```bash
# Reload shell configuration
source ~/miniconda3/bin/activate

# Verify installation
conda --version
python3 --version
```

## Essential Conda Commands

### Environment Management

#### Creating Environments

```bash
# Create new environment with specific Python version
conda create --name myenv python=3.9
#Or create env via file
conda env create -f environment.yml
```

#### Managing Environments

```bash
# List all environments
conda env list

# Activate environment
conda activate myenv

# Deactivate current environment
conda deactivate

```



## Environment Configuration Files

### Creating environment.yml

```yaml
# environment.yml
name: myproject
channels:
  - conda-forge
  - defaults
dependencies:
  - python=3.9
  - numpy
  - pandas
  - matplotlib
  - jupyter
  - pip
  - pip:
    - requests
    - beautifulsoup4
```

### Using environment.yml

```bash
# Create environment from file
conda env create -f environment.yml

# Update existing environment
conda env update -f environment.yml

# Export current environment
conda env export > environment.yml
```

## References

- [Anaconda Documentation](https://docs.anaconda.com/)
- [Conda User Guide](https://conda.io/projects/conda/en/latest/user-guide/index.html)
